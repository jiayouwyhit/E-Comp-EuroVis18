# coding: utf-8
from __future__ import division

import json
import pandas as pd
import re
from __builtin__ import len
from __builtin__ import list
from __builtin__ import open
from __builtin__ import str
from collections import Counter
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from pymining import assocrules
from pymining import itemmining
from pymining import seqmining
from pymongo import MongoClient

port_stemmmer = PorterStemmer()
word_net_lemmer = WordNetLemmatizer()

client = MongoClient()
db = client.yelp_comparative_analytics

raw = list(db.yelp_reviews.find({}))
print("[Info] Total elements " + str(len(raw)))

reviews_df = pd.DataFrame(raw)
word_dictionary = {}
word_count = 0
stop_words = set(stopwords.words('english'))


def combine_text(rows):
    lis = []
    for row in set(rows):
        lis.append(row)
    return lis


def remove_stop_words(sentence):
    global word_count
    global word_dictionary
    _data = []
    _encoded = []

    for elem in sentence.lower().split():
        if elem not in stop_words:
            elem = word_net_lemmer.lemmatize(elem)
            if elem in word_dictionary.keys():
                _encoded.append(str(word_dictionary[elem]))
                _data.append(elem)
            else:
                word_dictionary[elem] = str(word_count)
                _encoded.append(word_dictionary[elem])
                _data.append(elem)
                word_count += 1

    return _encoded


def format_word_split(txt):
    """Turns a text document to a list of formatted words.
    Get rid of possessives, special characters, multiple spaces, etc.
    """
    tt = re.sub(r"'s\b", '', txt).lower()  # possessives
    tt = re.sub(r'[\.\,\;\:\'\"\(\)\&\%\*\+\[\]\=\?\!/]', '', tt)  # weird stuff
    tt = re.sub(r'[\-\s]+', ' ', tt)  # hyphen -> space
    tt = re.sub(r' [a-z] ', ' ', tt)  # single letter -> space

    return remove_stop_words(tt.strip())


def for_each_elem(lis):
    row = []
    for elem in lis:
        row.append(format_word_split(elem))
    return row


def get_sequences(seqs, size):
    freq_seqs = seqmining.freq_seq_enum(seqs, size)
    return freq_seqs


def get_association_rules(seqs, min_support=2):
    transactions = list(seqs)

    # print transactions
    relim_input = itemmining.get_relim_input(transactions)
    item_sets = itemmining.relim(relim_input, min_support=min_support)
    rules = assocrules.mine_assoc_rules(item_sets, min_support=min_support, min_confidence=0.5)
    # print(rules)

    return rules


def from_set_(report):
    lis = []
    for keys in report.keys():
        lis.append([list(set(keys)), report[keys]])
    return lis


def frequent_itemset(transactions, support=2):
    relim_input = itemmining.get_relim_input(transactions)
    report = itemmining.relim(relim_input, min_support=support)
    return report


def get_tfidf(seq):
    l = []
    for elem in seq:
        l.extend(elem)

    return Counter(l)


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


count = 0
total = len(reviews_df)

business = sorted(list(reviews_df.business_id.unique()))
df = None
print("[Info] Started , business : " + str(len(business)))

lis = []
for business_id, df in reviews_df.groupby('business_id'):
    df = reviews_df[reviews_df['business_id'] == business_id].copy()

    grouped_review = df.groupby('text').apply(lambda x: combine_text(x.text))
    grouped_review.columns = ['text']
    grouped_reviews = grouped_review.reset_index()

    grouped_reviews['split_text'] = grouped_reviews.text.apply(lambda x: for_each_elem(x))
    grouped_reviews['count'] = grouped_reviews.split_text.apply(lambda x: len(x))


    gp_cy = grouped_reviews.copy()

    gp_cy['tfidf'] = gp_cy.split_text.apply(lambda x: get_tfidf(x))
    gp_cy['sequence_2'] = gp_cy.split_text.apply(lambda x: get_sequences(x, 2))
    gp_cy['sequence_3'] = gp_cy.split_text.apply(lambda x: get_sequences(x, 3))
    gp_cy['frequent_item_2'] = gp_cy.split_text.apply(lambda x: frequent_itemset(x, 2))
    gp_cy['frequent_item_3'] = gp_cy.split_text.apply(lambda x: frequent_itemset(x, 3))

    # gp_cy['association_rules'] = gp_cy.sequence_3.apply(lambda x: get_association_rules(x))

    # gp_cy['frequent_item_2'] = gp_cy.frequent_item_2.apply(lambda x: from_set_(x))
    # gp_cy['frequent_item_3'] = gp_cy.frequent_item_3.apply(lambda x: from_set_(x))
    #
    # gp_cy['sequence_3'] = gp_cy.sequence_3.apply(lambda x: list(x))
    # gp_cy['sequence_2'] = gp_cy.sequence_2.apply(lambda x: list(x))
    gp_cy['business_id'] = business_id
    if count % 1000 == 1:
        print("[Info] count = {count} stage = {stage}".format(count=count, stage='ALL ') + 'Total ' + str(
            total - count) + " done " + str(len(lis)))

        open("data/word_dict.json", "w+").write(json.dumps(word_dictionary))

    if df is None:
        df = gp_cy
    else:
        df = pd.concat([gp_cy, df])
    count += 1

    if len(df) > 1000:
        df.to_pickle('data/review_proceesed_'+str(count)+".json")
        df = None

df.to_pickle('data/review_proceesed_'+str(count)+".json")

open("data/word_dict.json", "w+").write(json.dumps(word_dictionary))
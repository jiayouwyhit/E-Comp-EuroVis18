# coding: utf-8
from __future__ import division

import nltk
import numpy as np
import pandas as pd
import re
from __builtin__ import len
from __builtin__ import list
from __builtin__ import open
from collections import Counter
from nltk.util import ngrams
import cPickle


def sum_of_list(list_of_lists):
    dict_x = {}
    for lis in list_of_lists:
        for elem in lis:
            try:
                dict_x[elem[1]] = float(elem[0]) + dict_x[elem[1]]
            except:
                dict_x[elem[1]] = float(elem[0])

    lis = [(k, v) for k, v in dict_x.items()]

    return lis


def sum_of_dict(list_of_dict):
    dict_lis = {}
    for dic in list_of_dict:
        for key in dic.keys():
            try:
                dict_lis[key] += dic[key]
            except:
                dict_lis[key] = dic[key]

    dict_lis = sorted(dict_lis.items(), key=operator.itemgetter(1), reverse=True)
    return dict_lis


def format_word_split(txt):
    """
        Turns a text document to a list of formatted words.
        Get rid of possessives, special characters, multiple spaces, etc.
    """
    tt = re.sub(r"'s\b", '', txt).lower()  # possessives
    tt = re.sub(r'[\.\,\;\:\'\"\(\)\&\%\*\+\[\]\=\?\!/]', '', tt)  # weird stuff
    tt = re.sub(r'[\-\s]+', ' ', tt)  # hyphen -> space
    tt = re.sub(r' [a-z] ', ' ', tt)  # single letter -> space
    tt = re.sub(r' [0-9]* ', ' ', tt)  # numbers

    tt = re.sub('\W+', ' ', tt)
    tt = tt.split(" ")

    ret = []
    for elem in tt:
        if elem not in stop_words:
            ret.append(elem)

    tt = ' '.join(ret)
    return tt.strip()


def get_ngrams(token, number=2):
    return list(set(ngrams(token, number)))


def get_sets():
    lis = []
    noun = ['NN ', 'NNS', 'NNP', 'NNPS']
    adj = ['JJ', 'JJR', 'JJS']

    for n in noun:
        for a in adj:
            lis.append(a + "," + n)

    lis.extend(noun)

    return set(lis)


def token_ze(text):
    text = format_word_split(text)
    tokens = nltk.word_tokenize(text)
    return tokens


def get_tfidf(seq):
    return Counter(seq)


def for_each_elem(lis):
    row = []
    for elem in lis:
        row.append(format_word_split(elem))
    return row


def _only_adjective_noun_features(feature_names):
    f_names = []
    for elem in sorted(feature_names):
        lis = []
        for item in nltk.pos_tag(elem.split(" ")):
            lis.append(item[1])

        lis = ','.join(lis)

        if lis in adj_noun_set:
            f_names.append(elem)

    return f_names


def get_sets():
    lis = []
    noun = ['NN ', 'NNS', 'NNP', 'NNPS']
    adj = ['JJ', 'JJR', 'JJS']

    for n in noun:
        for a in adj:
            lis.append(a + "," + n)

    lis.extend(noun)

    return set(lis)


def _index_to_element(coff, index, features=20):
    lis = []
    for elem in index:
        if feature_names[elem] in f_names:
            if coff[elem] >= 0:
                lis.append([coff[elem], feature_names[elem], 'pos'])
            elif coff[elem] < 0:
                lis.append([coff[elem], feature_names[elem], 'neg'])

    return lis  # sorted(lis, key=operator.itemgetter(0))


def assign_labels(lis, txt):
    l = []
    for elem in lis:
        if elem[2] == txt:
            l.append((elem[0], elem[1]))
    return l


def split_n(lis, number):
    ret_lis = []
    for elem in lis:
        if len(elem[0].split(" ")) == number:
            ret_lis.append(elem)

    return ret_lis


n_a_pair = set(['JJ', 'JJR', 'JJS', 'NN ', 'NNS', 'NNP', 'NNPS'])
adj_noun_set = get_sets()


def nlp_analysis(business_id, mongo_connection):
    data_path = '/Users/hammadhaleem/Desktop/yelp-data-api/server/data/'

    print("Load data")

    model = cPickle.load(open(data_path + 'modeltempe.pkl'))
    ngram_counter = cPickle.load(open(data_path + 'ngram_countertempe.pkl'))

    model_classifier = model.coef_.toarray()

    feature_names = ngram_counter.get_feature_names()

    print("Loaded models", len(feature_names))

    db = mongo_connection.db.yelp_reviews
    query = {
        'business_id': business_id
    }
    raw = list(db.find(query, {'business_id': 1, 'text': 1, 'stars': 1, 'review_id': 1}))
    for elem in raw:
        del elem['_id']

    reviews_df = pd.DataFrame(raw)

    reviews_df = reviews_df.drop('_id', axis=1)

    reviews_df['tokens'] = reviews_df.text.apply(lambda x: token_ze(x))
    reviews_df['text_tokens'] = reviews_df.tokens.apply(lambda x: ' '.join(x))

    reviews_df['features'] = reviews_df.text_tokens.apply(lambda x: ngram_counter.transform([x]))
    reviews_df['predicted'] = reviews_df.features.apply(lambda x: model.predict(x))

    reviews_df['indexes'] = reviews_df.features.apply(lambda x: list(x[0].indices))

    print('[Info] feature shapes ', model_classifier[0].shape, list(model.classes_))

    reviews_df['predicted'] = reviews_df.features.apply(lambda x: model.predict(x))

    reviews_df['count'] = 1
    reviews_df['feature_vars'] = reviews_df.indexes.apply(lambda x: _index_to_element(model_classifier[0], x))

    reviews_df['coef_pos'] = reviews_df.feature_vars.apply(lambda x: assign_labels(x, 'pos'))
    reviews_df['coef_neg'] = reviews_df.feature_vars.apply(lambda x: assign_labels(x, 'neg'))

    df = reviews_df.groupby('business_id').agg({
        'coef_neg': sum_of_list,
        'coef_pos': sum_of_list,
        'count': sum,
        'stars': np.mean,
        'tfidf': sum_of_dict
    }).reset_index()

    df['coef_neg'] = df.coef_neg.apply(lambda x: sorted(x, key=operator.itemgetter(1), reverse=False))
    df['coef_pos'] = df.coef_pos.apply(lambda x: sorted(x, key=operator.itemgetter(1), reverse=True))
    df['coef_pos_1'] = df.coef_pos.apply(lambda x: sorted(split_n(x, 1), key=operator.itemgetter(1), reverse=True))
    df['coef_neg_1'] = df.coef_neg.apply(lambda x: sorted(split_n(x, 1), key=operator.itemgetter(1), reverse=False))

    df['coef_pos_2'] = df.coef_pos.apply(lambda x: sorted(split_n(x, 2), key=operator.itemgetter(1), reverse=True))
    df['coef_neg_2'] = df.coef_neg.apply(lambda x: sorted(split_n(x, 2), key=operator.itemgetter(1), reverse=False))

    return raw

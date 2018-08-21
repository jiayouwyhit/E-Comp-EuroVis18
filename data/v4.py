# coding: utf-8
from __future__ import division

import cPickle
import json
import nltk
import pandas as pd
import re
import time
from __builtin__ import len
from __builtin__ import list
from __builtin__ import open
from __builtin__ import str
from collections import Counter
from nltk import tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.stem import WordNetLemmatizer
from nltk.util import ngrams
from pymongo import MongoClient
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.svm import SVC
from textblob import TextBlob

start_time = time.time()
data_dir = '/home/hammad/dev/yelp/txt_sentoken'
classes = ['pos', 'neg']

port_stemmmer = PorterStemmer()
word_net_lemmer = WordNetLemmatizer()

client = MongoClient()
db = client.yelp_comparative_analytics



word_dictionary = {}
word_count = 0
stop_words = set(stopwords.words('english'))

city = 'tempe'
bus_type = 'restaurants'


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


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


def _get_sentiment(star_polarity):
    if star_polarity >= 2.5:
        return 'pos'
    return 'neg'


def for_each_elem(lis):
    row = []
    for elem in lis:
        for item in tokenize.sent_tokenize(elem):
            row.append(format_word_split(item))

    return row


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

data_lis = list(db.yelp_business_information_processed.find({'city': city, 'type': bus_type}, {'business_id': 1}))
business = [x['business_id'] for x in data_lis]
print("[Info] Total business " + str(len(business)), 'time from start', (time.time() - start_time))

query = {
    'business_id': {'$in': business}
}

raw = list(db.yelp_reviews.find(query, {'business_id': 1, 'text': 1, 'stars': 1, 'review_id': 1}))
print("[Info] Total elements " + str(len(raw)), 'time from start', (time.time() - start_time))

reviews_df = pd.DataFrame(raw)

reviews_df['polarity'] = reviews_df.text.apply(lambda x: TextBlob(x).sentiment.polarity)
reviews_df['star_polarity'] = reviews_df['polarity'] + reviews_df['stars']

reviews_df['sentiment'] = reviews_df.star_polarity.apply(lambda x: _get_sentiment(x))

reviews_df = reviews_df.drop('_id', axis=1)
reviews_df.head(n=10)

n_a_pair = set(['JJ', 'JJR', 'JJS', 'NN ', 'NNS', 'NNP', 'NNPS'])

adj_noun_set = get_sets()
print('[Info] computed all pairs of pos tagger', 'time from start', (time.time() - start_time))

reviews_df['tokens'] = reviews_df.text.apply(lambda x: token_ze(x))
print(list(reviews_df.columns))

reviews_df['tfidf'] = reviews_df.tokens.apply(lambda x: get_tfidf(x))
reviews_df['text_tokens'] = reviews_df.tokens.apply(lambda x: ' '.join(x))

print('[Info] Tokenize , pos and what not !', 'time from start', (time.time() - start_time))
print(reviews_df.head())

print('[Info] Ngram and hot encoding .. reducing features .. this step will take time', 'time from start',
      (time.time() - start_time))

# # build the feature matrices
ngram_counter = CountVectorizer(ngram_range=(2, 4), analyzer='word')
ngram_counter.fit(reviews_df.text_tokens)

print('[Info] Ngram and hot encoding done ...saving ...', (time.time() - start_time))

with open('ngram_counter' + city + '.pkl', 'wb') as fid:
    cPickle.dump(ngram_counter, fid)


print('[Info] Computing features and writing ...saving ...', (time.time() - start_time))
feature_names = ngram_counter.get_feature_names()

with open('feature_names' + city + '.pkl', 'wb') as fid:
    cPickle.dump(feature_names, fid)


print('[Info] Computing SVC models ...', (time.time() - start_time))
X_train = ngram_counter.transform(reviews_df.text_tokens)
y_train = list(reviews_df.sentiment)

print('[Info] total_feautres', len(feature_names), 'time from start', (time.time() - start_time))

classifier = SVC(kernel='linear', cache_size=100000)
model = classifier.fit(X_train, y_train)

print('[Info] Save to pickle', (time.time() - start_time))

with open('model' + city + '.pkl', 'wb') as fid:
    cPickle.dump(model, fid)


from __future__ import print_function
from __future__ import division

import json
import nltk
import operator
import pandas as pd
import re
from __builtin__ import len
from __builtin__ import list
from __builtin__ import str
from nltk import tokenize
from nltk.corpus import stopwords
from nltk.util import ngrams
from pymongo import MongoClient
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import cross_val_score
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC

data_dir = '/home/hammad/dev/yelp/txt_sentoken'
classes = ['pos', 'neg']
global_count = 0
print("Step", global_count)
global_count += 1


def _index_to_element(coff, index, features=20):
    lis = []
    for elem in index:
        lis.append([coff[elem], feature_names[elem]])

    return sorted(lis, key=operator.itemgetter(0))[-features:]


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


# In[4]:

def _get_sentiment(star):
    if star > 3:
        return 'pos'
    elif star < 3:
        return 'neg'
    return 'neutral'


def for_each_elem(lis):
    row = []
    for elem in lis:
        for item in tokenize.sent_tokenize(elem):
            row.append(format_word_split(item))
    return row


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


def format_word_split(txt):
    """Turns a text document to a list of formatted words.
    Get rid of possessives, special characters, multiple spaces, etc.
    """
    tt = re.sub(r"'s\b", '', txt).lower()  # possessives
    tt = re.sub(r'[\.\,\;\:\'\"\(\)\&\%\*\+\[\]\=\?\!/]', '', tt)  # weird stuff
    tt = re.sub(r'[\-\s]+', ' ', tt)  # hyphen -> space
    tt = re.sub(r' [a-z] ', ' ', tt)  # single letter -> space
    tt = re.sub(r' [0-9]* ', ' ', tt)  # numbers

    tt = re.sub('\W+', ' ', tt)
    return tt.strip()


def token_ze(text):
    text = format_word_split(text)
    tokenize = nltk.word_tokenize(text)
    li = []
    for elem in tokenize:
        if elem not in stop_words:
            li.append(elem)
    return li


def get_ngrams(token, number=2):
    return list(set(ngrams(token, number)))


client = MongoClient()
db = client.yelp_comparative_analytics

word_dictionary = {}
word_count = 0
stop_words = set(stopwords.words('english'))
city = 'las_vegas'
bus_type = 'restaurants'
table = 'yelp_review_patterns_las_vagas_restaurant'

# In[45]:

business = [x['business_id'] for x in
            list(db.yelp_business_information_processed.find({'city': city, 'type': bus_type}, {'business_id': 1}))]
print(len(business))

query = {
    'business_id': {'$in': business}
}
raw = list(db.yelp_reviews.find(query, {'business_id': 1, 'text': 1, 'stars': 1, 'review_id': 1}))
print("[Info] Total elements " + str(len(raw)))

print("Step", global_count)
global_count += 1

reviews_df = pd.DataFrame(raw)
reviews_df['sentiment'] = reviews_df.stars.apply(lambda x: _get_sentiment(x))
reviews_df = reviews_df.drop('_id', axis=1)
print(reviews_df.head())

# In[46]:

reviews_df['tokens'] = reviews_df.text.apply(lambda x: token_ze(x))
print(list(reviews_df.columns))
print("Step", global_count)
global_count += 1

reviews_df['text_tokens'] = reviews_df.tokens.apply(lambda x: ' '.join(x))
reviews_df.head()

data_train, data_test = train_test_split(reviews_df, test_size=0.4)

# # build the feature matrices
ngram_counter = CountVectorizer(ngram_range=(1, 4), analyzer='word')
ngram_counter.fit(data_train.text_tokens)
ngram_counter.fit(data_test.text_tokens)

print("Step", global_count)
global_count += 1

X_train = ngram_counter.transform(data_train.text_tokens)
X_test = ngram_counter.transform(data_test.text_tokens)

y_train = list(data_train.sentiment)
y_test = list(data_test.sentiment)

print("Step", global_count)
global_count += 1
# In[49]:

feature_names = ngram_counter.get_feature_names()

# In[50]:

print(len(feature_names))

# In[51]:
print("Step", global_count)
global_count += 1
classifier = SVC(kernel='linear')
model = classifier.fit(X_train, y_train)
print("Step", global_count)
global_count += 1
# In[52]:

print(list(cross_val_score(model, X_test, y_test)), list(model.classes_))

# In[53]:

coef = model.coef_.toarray()
print("Step", global_count)
global_count += 1
reviews_df['features'] = reviews_df.text_tokens.apply(lambda x: ngram_counter.transform([x]))
reviews_df['predicted'] = reviews_df.features.apply(lambda x: model.predict(x))

# In[54]:

print(ngram_counter.decode)

# In[55]:

reviews_df['indexes'] = reviews_df.features.apply(lambda x: list(x[0].indices))
print("Step", global_count)
global_count += 1
# In[56]:

model_classifier = model.coef_.toarray()
model_classifier[0].shape, list(model.classes_)
print("Step", global_count)
global_count += 1
reviews_df['coef_neg'] = reviews_df.indexes.apply(lambda x: _index_to_element(model_classifier[0], x))

reviews_df['coef_neu'] = reviews_df.indexes.apply(lambda x: _index_to_element(model_classifier[1], x))

reviews_df['coef_pos'] = reviews_df.indexes.apply(lambda x: _index_to_element(model_classifier[2], x))

reviews_df.head(5)

# In[67]:
print("Step", global_count)
global_count += 1
reviews_df = reviews_df.drop('text', axis=1)
reviews_df = reviews_df.drop('tokens', axis=1)
reviews_df = reviews_df.drop('indexes', axis=1)
reviews_df = reviews_df.drop('predicted', axis=1)
reviews_df = reviews_df.drop('features', axis=1)
reviews_df.columns

to_mongo_db(reviews_df, 'yelp_reviews_terms_las_vegas')
print("Step", global_count)
global_count += 1

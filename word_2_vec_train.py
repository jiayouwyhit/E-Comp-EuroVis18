# coding: utf-8

# In[1]:

from __future__ import division

import gensim
import multiprocessing
import nltk
import pandas as pd
import time
from __builtin__ import len
from __builtin__ import list
from __builtin__ import str

start_time = time.time()
from pymongo import MongoClient

client = MongoClient()
db = client.yelp_comparative_analytics

bus_type = 'restaurants'
table = 'yelp_review_patterns_las_vagas_restaurant'
city = 'all'
# In[3]:

business = [x['business_id'] for x in list(db.yelp_business_information_processed.find())]
print("[Info] Total business " + str(len(business)), 'time from start', (time.time() - start_time))

query = {
    'business_id': {'$in': business}
}
raw = list(db.yelp_reviews.find(query, {'business_id': 1, 'text': 1, 'stars': 1, 'review_id': 1}))
print("[Info] Total elements " + str(len(raw)), 'time from start', (time.time() - start_time))

reviews_df = pd.DataFrame(raw)
reviews_df = reviews_df.drop('_id', axis=1)

# In[ ]:
print("created df", (time.time() - start_time))
reviews_df['text'] = reviews_df.text.apply(lambda x: x.strip().lower())
print("text", (time.time() - start_time))


def fix_df(data_frame_reviews):
    lis = []
    count = 1
    for _, row in data_frame_reviews.iterrows():
        row = row.to_dict()
        row['tokens'] = []
        for elem in nltk.word_tokenize(row['text']):
            row['tokens'].append(elem)

        if count % 10010 == 0:
            print (count, (time.time() - start_time))
        count += 1
        lis.append(row)
    review = pd.DataFrame(lis)
    return review


reviews_df = fix_df(reviews_df)

print("Tokens", (time.time() - start_time))
reviews_df.to_csv(city + "-tmp.csv", encoding='utf-8')

cores = multiprocessing.cpu_count()
print(cores, (time.time() - start_time))

sentences = [x for x in reviews_df.tokens]

print ("Run model", (time.time() - start_time))
model = gensim.models.Word2Vec(sentences=sentences, size=1000, min_count=1, window=5, workers=cores)

print ("Save model", (time.time() - start_time))
model.save('new-all-rest.word2vec.model')

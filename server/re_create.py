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
import numpy as np


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


client = MongoClient()
db = client.yelp_comparative_analytics

raw_ = list(db.yelp_reviews.find({}, {'stars': 1, 'business_id': 1}))
df_review = pd.DataFrame(raw_)

raw_data = list(db.yelp_business_information_processed.find({}))
final_output = []

count = 0
for item in raw_data:

    del item['_id']
    business_id = item['business_id']
    tmp_df = df_review[df_review['business_id'] == business_id]

    item['tota_reviews'] = len(tmp_df)
    item['review_distribution'] = np.histogram(tmp_df.stars, bins=[0, 1, 2, 3, 4, 5])[0]

    if item['attributes'] is None:
        item['price_range'] = None
    else:
        count_t = 0
        for att in item['attributes']:
            if 'RestaurantsPriceRange2' in att and count_t is 0:
                tmp = att.split(":")[1]
                item['price_range'] = int(tmp)
                count_t += 1

    final_output.append(item)
    count += 1
    if len(final_output) > 500:
        df = pd.DataFrame(final_output)
        to_mongo_db(df, 'yelp_business_information_processed_all')
        print((len(df), count))
        final_output = []

df = pd.DataFrame(final_output)
to_mongo_db(df, 'yelp_business_information_processed_all')
final_output = []
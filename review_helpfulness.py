# coding: utf-8

import json
import numpy as np
import pandas as pd
from pymongo import MongoClient

client = MongoClient()
db = client.yelp_comparative_analytics

city = 'tempe'
_type = 'restaurants'
table = 'yelp_review_patterns_las_vagas_restaurant'
city = raw_input('enter city ')

query = {
    'city': city,
    'type': _type
}

business = [x['business_id'] for x in list(db.yelp_business_information_processed.find(query))]
print(len(business))

# In[4]:

query = {
    'business_id': {'$in': business}
}
what = {

    'business_id': 1,
    'review_id': 1,
    'funny': 1,
    'cool': 1,
    'stars': 1,
    'userful': 1,
    'text': 1,
    'useful': 1
}
raw = list(db.yelp_reviews.find(query))
print("[Info] Total elements " + str(len(raw)))

reviews_df = pd.DataFrame(raw)
reviews_df = reviews_df.drop("_id", axis=1)

# In[5]:

reviews_df['word_count'] = reviews_df.text.apply(lambda x: len(x.split(" ")))
print("Word count done")


# In[6]:

def format_word_split(txt):
    """Turns a text document to a list of formatted words.
    Get rid of possessives, special characters, multiple spaces, etc.
    """
    tt = txt.lower().replace("  ", " ").replace("\t", " ").replace("\n", " ").replace("~", "").replace("!",
                                                                                                       " ").replace('/',
                                                                                                                    " ").replace(
        "'", "").lstrip()

    return tt


# In[7]:

print("Correct the text of words done")
reviews_df['text'] = reviews_df.text.apply(lambda x: format_word_split(x))

# In[8]:

print("Polarity of words done")


# reviews_df['polarity'] = reviews_df.text.apply(lambda x : 100*abs(TextBlob(x).sentiment.polarity))


# In[9]:

def map_reviews(review_rating):
    dict_ = {
        3: 3,
        2: 2,
        1: 1,
        4: 2,
        5: 1
    }
    return dict_[review_rating]


print("Map reviews ")
reviews_df['stars_inv'] = reviews_df.stars.apply(lambda x: map_reviews(x))


# In[10]:

def scaling_(number_list, scaling_factor=10):
    maxi = np.max(number_list)
    mini = np.min(number_list)

    ret = []
    if mini < 0:
        for elem in number_list:
            ret.append(elem)
        number_list = ret[:]

    maxi = np.max(number_list)
    mini = np.max(number_list)
    if maxi == mini:
        return number_list

    scaled = [scaling_factor * (float(x) / maxi) for x in number_list]
    return scaled


# In[11]:

def scores_to_scale(score):
    ret = []
    bins = [0] + list(np.histogram(score, bins=8)[1])
    bins.append(np.max(score) + 10)

    for elem in score:
        pos = None
        for i in range(len(bins)):
            if bins[i] <= elem <= bins[i + 1]:
                pos = bins.index(bins[i])
        ret.append(pos)
    return ret


# In[13]:

print("calculating score  start")
ret = []
reviews_df_scored = None
review_grouped = reviews_df.groupby('business_id')
for _, group in review_grouped:
    group = group.copy()

    group['user_votes'] = group['useful'] + group['cool'] + group['funny']
    group['sc_word_count'] = scaling_(group.word_count)
    group['sc_user_score'] = scaling_(group.user_votes, 30)
    group['sc_stars'] = scaling_(group.stars_inv)

    group['score'] = group['user_votes'] + group['sc_word_count'] + group['sc_stars']
    group['scaled_score'] = scores_to_scale(group.score)

    ret.append(group)

    if reviews_df_scored is None:
        reviews_df_scored = group.copy()
    else:
        reviews_df_scored = pd.concat([group, reviews_df_scored])
print("calculating score done")

reviews_df_scored.sort_values('scaled_score', ascending=False).head(n=20)


def to_mongo_db(df, collection_name):
    records = json.loads(df.T.to_json()).values()
    db[collection_name].insert_many(records)


to_mongo_db(reviews_df_scored, 'yelp_review_scored')


# coding: utf-8

from datetime import datetime
from bs4 import BeautifulSoup

import pandas as pd
import matplotlib.pyplot as plt

import os, json, math, pprint
import glob, datetime, ast, pytz
from sqlalchemy import create_engine
import psycopg2
import pandas as pd
import seaborn as sns

db_path = 'localhost:14000/'
engine = create_engine('postgresql://postgres:kgggdkp1992@'+db_path+'yelp')

df_business =  pd.DataFrame([json.loads(line) for line in open('yelp_academic_dataset_business.json').readlines()])
df_business = df_business.set_index('business_id')
print(df_business.to_sql('business_information', engine,  if_exists='replace', chunksize=10000))

df_business_attributes = df_business[['attributes']].copy()
print(df_business_attributes.to_sql('business_attributes', engine , if_exists='replace',chunksize=10000))

df_business_categories = df_business[[u'categories']].copy()
print(df_business_categories.to_sql('business_categories', engine, if_exists='replace',chunksize=10000))

df_users =  pd.DataFrame([json.loads(line) for line in open('yelp_academic_dataset_user.json').readlines()])
print(df_users.to_sql('users', engine, if_exists='replace',chunksize=100000))
df_users.head(2)

df_tips =  pd.DataFrame([json.loads(line) for line in open('yelp_academic_dataset_tip.json').readlines()])
print(df_tips.to_sql('tips', engine , if_exists='replace',chunksize=100000))

df_checkins =  pd.DataFrame([json.loads(line) for line in open('yelp_academic_dataset_checkin.json').readlines()])
print(df_checkins.to_sql('checkins', engine, if_exists='replace',chunksize=100000))

df_reviews =  pd.DataFrame([json.loads(line) for line in open('yelp_academic_dataset_review.json').readlines()])
print(df_reviews.to_sql('reviews', engine, if_exists='replace',chunksize=100000))
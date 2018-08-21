# coding: utf-8

from math import radians, cos, sin, asin, sqrt
from pymongo import MongoClient

client = MongoClient()
mongo_connection = client.yelp_comparative_analytics

raw = list(mongo_connection.yelp_business_information_processed.find({}, {
    'city': 1,
    'latitude': 1,
    'longitude': 1,
    'business_id': 1,
    'type': 1}))

raw = sorted(raw, key=lambda k: k['city'])

data_store_ = raw[:]


def create_index_of_reviews():
    data_dict = {}
    reviews = [(x['business_id'], x['user_id']) for x in
               list(mongo_connection.yelp_reviews.find({}, {"user_id": 1, 'business_id': 1}))]
    tips = [(x['business_id'], x['user_id']) for x in
            list(mongo_connection.yelp_tips.find({}, {"user_id": 1, 'business_id': 1}))]

    reviews.extend(tips)
    reviews = set(reviews)
    for elem in reviews:
        try:
            data_dict[elem[0]].append(elem[1])
        except:
            data_dict[elem[0]] = []
            data_dict[elem[0]].append(elem[1])

    for key in data_dict.keys():
        data_dict[key] = set(data_dict[key])
    return data_dict

data_dict_cache = create_index_of_reviews()

cache_dict = {}


def to_mongo_db(df, collection_name):
    print(("Done", len(df), mongo_connection[collection_name].insert_many(df)))


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    # haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    km = 6367 * c
    return km


def get_social_graph_two_business(business_id1, business_id2):
    try:
        user_list1 = data_dict_cache[business_id1]
    except:
        return 0

    try:
        user_list2 = data_dict_cache[business_id2]
    except:
        return 0

    common_users = user_list1.intersection(user_list2)
    return len(common_users)

lis = []
print("Total", len(raw) * len(raw))
count = 1
ct = 1
for business_1 in raw:
    for business_2 in raw:
        count += 1
        dist = haversine(
            business_1['longitude'],
            business_1['latitude'],
            business_2['longitude'],
            business_2['latitude']
        )

        if business_2 != business_1:
            if dist < 100.0 or (business_1['city'] is business_2['city']):
                if business_2['type'] == business_1['type']:

                    common_friends = get_social_graph_two_business(
                        business_1['business_id'],
                        business_2['business_id']
                    )
                    if common_friends > 0 :
                        lis.append({
                            'source': business_1['business_id'],
                            'destination': business_2['business_id'],
                            'common_users': common_friends,
                            'distance_meters': dist * 1000,
                            'city_1': business_1['city'],
                            'city_2': business_2['city'],
                            'type': business_2['type']
                        })

            if len(lis) > 100000:
                print(count, len(lis))
                to_mongo_db(lis, 'yelp_business_graph_type_all')
                lis = []
                cache_dict = {}

        if count % 10000000 == 1:
            print(count, len(lis))

print(count)
to_mongo_db(lis, 'yelp_business_graph_type_all')
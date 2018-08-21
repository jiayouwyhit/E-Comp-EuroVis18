from __future__ import print_function

from __builtin__ import len
from __builtin__ import list
from __builtin__ import set
from __builtin__ import str
from bson.json_util import dumps
from flask import Blueprint, jsonify, url_for

from server import app, mongo_connection, cache
from server.mod_api.get_word_pairs import get_word_pairs, create_groups
from server.mod_api.graph_get import graph_in_box
from server.mod_api.utils import get_user_information_from_mongo, \
    get_business_graph, get_user_information_list, haversine, get_user_business_ratings

import hashlib
import pprint

pp = pprint.PrettyPrinter(indent=4)
mod_api = Blueprint('api', __name__, url_prefix='/api')
app.url_map.strict_slashes = False
global_timeout = 4000000


def make_cache_key(*args, **kwargs):
    path = request.path
    args = str(hash(frozenset(request.args.items())))
    lang = get_locale()
    str = (path + args + lang).encode('utf-8')
    str = hashlib.md5(str).hexdigest()
    return str


@mod_api.route('/')
@mod_api.route('/index')
def api_index():
    return jsonify(data={
        'get_business_information': '<None, business_id>',
        'get_business_information_city': '<city>',
        'get_business_graph': '<business_id>',
        'get_user_information': '<user_id>',
        'get_social_graph_of_two_business': "<business_id1 > , <business_id2>",
        'get_social_graph_common': "<business_id1 > , <business_id2>",
        'get_cities': "<None>",
        'get_types': '<None>',
        'get_business_information_city_type': "<city> / <type>",
        'get_business_information_lat_lon': '<lat1 , lon1 > , <lat2 , long2>',
        'get_competition_graph': "business_id , distance",
        'examples': [
            'http://localhost:5002/api/get_business_information_city/las_vegas',
            'http://localhost:5002/api/get_business_information_city/tempe',
            'http://localhost:5002/api/get_business_information_city_type/tempe/health',
            'http://localhost:5002/api/get_business_information_city_type/las_vegas/restaurants',
            'http://localhost:5002/api/get_business_information_lat_lon/-111.952229/33.422129/-111.926308/33.407227',
            'http://localhost:5002/api/get_competition_graph/nEE4k6PJkRGuV3nWoVUGRw/500',
            'http://localhost:5002/api/get_competition_graph/nEE4k6PJkRGuV3nWoVUGRw/1000',
            'http://localhost:5002/api/get_competition_graph/zUHIDqm_UKdnSygmWKtyRg/500',
            'http://localhost:5002/api/get_competition_graph/zUHID qm_UKdnSygmWKtyRg/1000',
            'http://localhost:5002/api/get_cities',
            'http://localhost:5002/api/get_types',
            "http://localhost:5002/api/nlp/review_analysis/['1o0g0ymmHl6HRgrg3KEM5w' , '1nJaL6VBUHR1DlErpnsIBQ' , '4cDrkvLInTuSlBU9zNOi8Q' , '4cCxazHh5DfWJ9eOcfvlSA' , 'nslcUj3coPzFFzeSYrkqrQ' , '4cOrGZfCKbhhdjZohhBkPQ']/"
        ],
        'helper': [
            'http://www.birdtheme.org/useful/v3tool.html',
            'http://www.bogotobogo.com/python/MongoDB_PyMongo/python_MongoDB_RESTAPI_with_Flask.php'
        ]
    })


@mod_api.route('/get_cities')
def get_cities():
    cities = mongo_connection.db

    pipeline = [
        {"$group": {"_id": "$city", "count": {"$sum": 1}}}
    ]

    cities = cities.yelp_business_information_processed_all.aggregate(pipeline)
    dict_tmp = []
    for elem in cities:
        dict_tmp.append([elem[u'_id'], int(elem[u'count'])])

    dict_tmp = sorted(dict_tmp, key=lambda x: x[1], reverse=True)
    return jsonify(cities=dict_tmp)


@mod_api.route('/get_types')
def get_types():
    types = mongo_connection.db.yelp_business_information_processed_all
    types = types.distinct('type')
    return jsonify(types=types)


@mod_api.route('/get_business_information_city_type/<city>/<type>')
def business_information_city_type(city, type):
    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all
    data_query = yelp_business_information.find({'city': city, 'type': type},
                                                {"business_id": 1,
                                                 'longitude': 1,
                                                 'review_count': 1,
                                                 'name': 1,
                                                 'latitude': 1,
                                                 'stars': 1,
                                                 'city': 1,
                                                 'rating': 1,
                                                 'price_range': 1,
                                                 'type': 1,
                                                 'review_distribution': 1
                                                 })

    output = []
    for business in data_query:
        data_dict = {
            "business_id": business['business_id'],
            'longitude': business['longitude'],
            'review_count': business['review_count'],
            'name': business['name'],
            'latitude': business['latitude'],
            'stars': business['stars'],
            'city': business['city'],
            'type': business['type']
        }

        try:
            data_dict['rating'] = business['review_distribution']
        except Exception as e:
            data_dict['rating'] = None

        try:
            data_dict['price_range'] = business['price_range']
        except Exception as e:
            data_dict['price_range'] = None

        output.append(data_dict)

    return jsonify(output)


@mod_api.route('/get_business_information/')
@mod_api.route('/get_business_information/<business_id>')
@mod_api.route('/get_business_information/<business_id>/<next_page>')
def business_information(business_id=None, next_page=None):
    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all

    if business_id is None or business_id == "ALL":

        if next_page is None:
            next_page = 0
        else:
            next_page = int(next_page)

        output = []
        cache_key = "business_id_none_cached"

        yelp_business_information_return = cache.get(cache_key)

        if yelp_business_information_return is None:
            for business in yelp_business_information.find({}, {
                "business_id": 1,
                'longitude': 1,
                'review_count': 1,
                'name': 1,
                'latitude': 1,
                'stars': 1,
                'city': 1
            }):
                output.append({
                    "business_id": business['business_id'],
                    'longitude': business['longitude'],
                    'review_count': business['review_count'],
                    'name': business['name'],
                    'latitude': business['latitude'],
                    'stars': business['stars'],
                    'city': business['city']
                })

            cache.set(cache_key, output, timeout=300)

            return jsonify(business=output[next_page: next_page + 100],
                           next=url_for('api.business_information', business_id='ALL', next_page=next_page + 100),
                           total=len(output))
        else:

            output = yelp_business_information_return
            return jsonify(business=output[next_page: next_page + 100],
                           next=url_for('api.business_information', business_id='ALL', next_page=next_page + 100),
                           total=len(output)
                           )
    else:
        user = dumps(yelp_business_information.find({'business_id': business_id}))
        return user


@mod_api.route('/get_business_information_city/<city>')
def business_information_city(city=None):
    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all

    output = []
    for business in yelp_business_information.find({'city': city}, {
        "business_id": 1,
        'longitude': 1,
        'review_count': 1,
        'name': 1,
        'latitude': 1,
        'stars': 1,
        'city': 1,
        'type': 1,
        'price_range': 1,
        'review_distribution': 1
    }):

        data_dict = {
            "business_id": business['business_id'],
            'longitude': business['longitude'],
            'review_count': business['review_count'],
            'name': business['name'],
            'latitude': business['latitude'],
            'stars': business['stars'],
            'city': business['city'],
            'type': business['type']}

        try:
            data_dict['rating'] = business['review_distribution']
        except Exception as e:
            data_dict['rating'] = None

        try:
            data_dict['price_range'] = business['price_range']
        except Exception as e:
            data_dict['price_range'] = None

        output.append(data_dict)
    return jsonify(output)


@mod_api.route('/get_user_information/<user_id>')
def get_user_information(user_id=None):
    user_information = cache.get(str(user_id) + "_user_information")
    if user_information is not None:
        output = user_information
    else:
        output = get_user_information_from_mongo(user_id)
        cache.set(str(user_id) + "_user_information", output, timeout=30)
    return jsonify(output)


@mod_api.route('/get_business_graph/<business_id>')
def business_graph(business_id=None):
    if business_id is not None:
        user_list, friends_edges = get_business_graph(business_id)
        list_output = []
        user_dict = get_user_information_list(user_list)
        for elem in user_list:
            list_output.append({
                'user_id': elem,
                'group': 0,
                'details': user_dict[elem]
            })

        edge_output = []
        for elem in friends_edges:
            if elem[0] in user_list and elem[1] in user_list:
                edge_output.append({
                    'start': elem[0],
                    'end': elem[1],
                    'group': 0
                })

        return jsonify(nodes=list_output, edges=edge_output)
    else:
        return jsonify(data=None)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_social_graph_common/<business_id1>/<business_id2>')
def get_business_graph_two_common(business_id1, business_id2):
    business_id1, business_id2 = sorted([business_id1, business_id2])
    data1 = get_business_graph(business_id1)
    data2 = get_business_graph(business_id2)

    if data1 is None or data2 is None:
        return None

    user_list1, friends_edges1 = data1
    user_list2, friends_edges2 = data2

    sum_before = len(user_list1) + len(friends_edges1) + len(user_list2) + len(friends_edges2)

    common_users = set(set(user_list1)).intersection(set(user_list2))
    common_edges = set(set(friends_edges1)).intersection(set(friends_edges2))

    user_list1 = set(user_list1) - common_users
    friends_edges1 = set(friends_edges1) - common_edges

    user_list2 = set(user_list2) - common_users
    friends_edges2 = set(friends_edges2) - common_edges

    sum_after = len(user_list1) + len(friends_edges1) + len(user_list2) + len(friends_edges2) \
                + 2 * len(common_users) + 2 * len(common_edges)

    if sum_before != sum_after:
        raise "Set error !"

    edge_output = []
    list_output = []

    all_users = list(set(list(user_list1) + list(user_list2) + list(common_users)))
    user_dict = get_user_information_list(list(all_users))
    user_dict = get_user_business_ratings(user_dict, business_id1, business_id2)

    ''' common business '''
    for elem in list(common_users):
        list_output.append({
            'user_id': elem,
            'group': 2,
            'details': user_dict[elem],
            'index': all_users.index(elem)
        })

    done = []
    for elem in list(common_edges):
        if elem[0] in common_users and elem[1] in common_users and elem not in done:
            edge_output.append({
                'start': elem[0],
                'end': elem[1],
                'group': 2,
                'source': all_users.index(elem[0]),
                'target': all_users.index(elem[1])
            })

            done.append((elem[0], elem[1]))
            done.append((elem[1], elem[0]))

    return jsonify(nodes=list_output, links=edge_output)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_social_graph_of_two_business/<business_id1>/<business_id2>')
def business_graph_two(business_id1, business_id2):
    business_id1, business_id2 = sorted([business_id1, business_id2])
    data1 = get_business_graph(business_id1)
    data2 = get_business_graph(business_id2)

    if data1 is None or data2 is None:
        return None

    user_list1, friends_edges1 = data1
    user_list2, friends_edges2 = data2

    sum_before = len(user_list1) + len(friends_edges1) + len(user_list2) + len(friends_edges2)

    common_users = set(set(user_list1)).intersection(set(user_list2))
    common_edges = set(set(friends_edges1)).intersection(set(friends_edges2))

    user_list1 = set(user_list1) - common_users
    friends_edges1 = set(friends_edges1) - common_edges

    user_list2 = set(user_list2) - common_users
    friends_edges2 = set(friends_edges2) - common_edges

    sum_after = len(user_list1) + len(friends_edges1) + len(user_list2) \
                + len(friends_edges2) + 2 * len(common_users) + 2 * len(common_edges)

    if sum_before != sum_after:
        raise "Set error !"

    ''' Create data for output ! '''
    list_output = []
    edge_output = []

    all_users = list(set(list(user_list1) + list(user_list2) + list(common_users)))
    user_dict = get_user_information_list(all_users)

    '''  First business '''
    for elem in list(user_list1):
        list_output.append({
            'user_id': elem,
            'group': 0,
            'details': user_dict[elem],
            'index': all_users.index(elem)
        })

    ''' Second business '''
    for elem in list(user_list2):
        list_output.append({
            'user_id': elem,
            'group': 1,
            'details': user_dict[elem],
            'index': all_users.index(elem)
        })

    ''' Common business '''
    for elem in list(common_users):
        list_output.append({
            'user_id': elem,
            'group': 2,
            'details': user_dict[elem],
            'index': all_users.index(elem)
        })

    ## Remove duplicates and add edges

    done = []

    for elem in list(friends_edges1):
        if elem[0] in user_list1 and elem[1] in user_list1 and elem not in done:
            edge_output.append({
                'start': elem[0],
                'end': elem[1],
                'group': 0,
                'source': all_users.index(elem[0]),
                'target': all_users.index(elem[1])
            })

            done.append((elem[0], elem[1]))
            done.append((elem[1], elem[0]))

    for elem in list(friends_edges2):
        if elem[0] in user_list2 and elem[1] in user_list2 and elem not in done:
            edge_output.append({
                'start': elem[0],
                'end': elem[1],
                'group': 1,
                'source': all_users.index(elem[0]),
                'target': all_users.index(elem[1])
            })

            done.append((elem[0], elem[1]))
            done.append((elem[1], elem[0]))

    for elem in list(common_edges):
        if elem[0] in common_users and elem[1] in common_users and elem not in done:
            edge_output.append({
                'start': elem[0],
                'end': elem[1],
                'group': 2,
                'source': all_users.index(elem[0]),
                'target': all_users.index(elem[1])
            })

            done.append((elem[0], elem[1]))
            done.append((elem[1], elem[0]))

    return jsonify(nodes=list_output, links=edge_output)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_business_information_lat_lon/<lat1>/<lon1>/<lat2>/<lon2>')
def get_business_information_lat_lon(lat1, lon1, lat2, lon2):
    ''' Example queries

        http://0.0.0.0:5002/api/get_business_information_lat_lon/-111/33/-112/34
        http://0.0.0.0:5002/api/get_business_information_lat_lon/-111.952229/33.422129/-111.926308/33.407227

        http://www.birdtheme.org/useful/v3tool.html

    '''
    lat1 = float(lat1)
    lat2 = float(lat2)
    lon1 = float(lon1)
    lon2 = float(lon2)

    polygon = []
    polygon.append((lat1, lon1))
    polygon.append((lat1, lon2))
    polygon.append((lat2, lon2))
    polygon.append((lat2, lon1))
    polygon.append((lat1, lon1))

    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all
    query = {
        'geometry': {
            '$geoWithin': {
                '$geometry': {
                    'type': "Polygon",
                    'coordinates': [polygon]
                }
            }
        }
    }
    data_query = list(yelp_business_information.find(query))

    output = []
    for business in data_query:
        data_dict = {
            "business_id": business['business_id'],
            'longitude': business['longitude'],
            'review_count': business['review_count'],
            'name': business['name'],
            'latitude': business['latitude'],
            'stars': business['stars'],
            'city': business['city']
        }

        try:
            data_dict['rating'] = business['review_distribution']
        except Exception as e:
            data_dict['rating'] = None

        try:
            data_dict['price_range'] = business['price_range']
        except Exception as e:
            data_dict['price_range'] = None

        output.append(data_dict)

    return jsonify(polygon=polygon, data=output)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_competition_graph/<business_id>/')
@mod_api.route('/get_competition_graph/<business_id>/<distance_meters>')
def competition_graph(business_id, distance_meters=1000):
    distance_meters = float(distance_meters)

    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all

    business_data = list(yelp_business_information.find({'business_id': business_id}, {
        'business_id': 1,
        'longitude': 1,
        'review_count': 1,
        'name': 1,
        'latitude': 1,
        'stars': 1,
        'city': 1,
        'type': 1,
        'price_range': 1,
        'rating': 1
    }))[0]

    business_data.pop('_id')

    query = {
        'geometry':
            {'$near':
                {
                    '$geometry': {'type': "Point",
                                  'coordinates': [business_data['longitude'], business_data['latitude']]},
                    '$maxDistance': distance_meters
                }
            }
        ,
        'type': business_data['type']
    }
    data_query = list(yelp_business_information.find(query, {
        'business_id': 1,
        'longitude': 1,
        'review_count': 1,
        'name': 1,
        'latitude': 1,
        'stars': 1,
        'city': 1,
        'type': 1
    }))

    for elem in data_query:
        elem.pop("_id")
        elem['distance_meters'] = haversine(
            elem['longitude'],
            elem['latitude'],
            business_data['longitude'],
            business_data['latitude']
        )

    yelp_social_ = mongo_connection.db.yelp_business_graph_type_all
    connections = list(
        yelp_social_.find({
            'source': business_id,
            'distance_meters': {
                '$lte': float(distance_meters)
            },
            'type': business_data['type']
        }))
    map(lambda d: d.pop('_id'), connections)

    print((len(data_query), len(connections)))

    return jsonify(all=data_query, data=business_data, common_graph=connections)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_business_graph_box/<lat1>/<lon1>/<lat2>/<lon2>')
def get_business_graph_box_no_city(lat1, lon1, lat2, lon2):
    """ Example queries

        /api/get_business_graph_box/tempe/health/-111.94647721946242/33.42943568280503/-111.93797998130323/33.417615716327546/

    """
    lat1 = float(lat1)
    lat2 = float(lat2)
    lon1 = float(lon1)
    lon2 = float(lon2)

    polygon = [(lat1, lon1), (lat1, lon2), (lat2, lon2), (lat2, lon1), (lat1, lon1)]

    nodes, link = graph_in_box(city=None, type=None, polygon=polygon)
    return jsonify(nodes=nodes, links=link)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_business_graph_box/<city>/<type>/<lat1>/<lon1>/<lat2>/<lon2>')
def get_business_graph_box(city, type, lat1, lon1, lat2, lon2):
    """ Example queries

        /api/get_business_graph_box/tempe/health/-111.94647721946242/33.42943568280503/-111.93797998130323/33.417615716327546/

    """
    lat1 = float(lat1)
    lat2 = float(lat2)
    lon1 = float(lon1)
    lon2 = float(lon2)

    polygon = [(lat1, lon1), (lat1, lon2), (lat2, lon2), (lat2, lon1), (lat1, lon1)]

    nodes, link = graph_in_box(city, type, polygon)
    return jsonify(nodes=nodes, links=link)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_review_information/<business_id1>/<business_id2>')
def review_information_agg(business_id1, business_id2):
    business_ids = sorted([business_id1, business_id2])
    yelp_business_information = mongo_connection.db.yelp_review_scored

    query = {
        'business_id': {
            '$in': business_ids
        }
    }

    what = {
        'business_id': 1,
        'review_id': 1,
        'date': 1,
        'user_id': 1,
        'stars': 1,
        'score': 1,
        'scaled_score': 1,
        'cool': 1,
        'user_votes': 1,
        'funny': 1,
        'useful': 1,
        'sc_word_count': 1,
        'word_count': 1
    }

    user_list = {
        business_id1: [],
        business_id2: []
    }

    data_dict = {
        business_id1: [],
        business_id2: []
    }

    lis = list(yelp_business_information.find(query, what))

    lis = sorted(lis, key=lambda k: k['date'])

    date_list = [e['date'] for e in lis]

    max_date = max(date_list)
    min_date = min(date_list)

    for elem in lis:
        del elem['_id']
        user_list[elem['business_id']].append(elem['user_id'])
        data_dict[elem['business_id']].append(elem)

    user_list[business_id2] = set(user_list[business_id2])
    user_list[business_id1] = set(user_list[business_id1])

    for elem in data_dict[business_id1]:
        if elem['user_id'] in user_list[business_id2]:
            elem['common'] = 'true'
        else:
            elem['common'] = 'false'

    for elem in data_dict[business_id2]:
        if elem['user_id'] in set(user_list[business_id1]):
            elem['common'] = 'true'
        else:
            elem['common'] = 'false'

    return jsonify(data=data_dict, max_date=max_date, min_date=min_date)


@cache.cached(timeout=global_timeout, key_prefix=make_cache_key)
@mod_api.route('/get_review_by_id/<review_id>')
def review_by_id(review_id):
    review = list(mongo_connection.db.yelp_reviews.find({'review_id': review_id}))[0]
    del review['_id']

    user_name = list(mongo_connection.db.yelp_users.find({'user_id': review['user_id']}, {'name': 1}))[0]
    business_name = \
        list(mongo_connection.db.yelp_business_information.find({'business_id': review['business_id']}, {'name': 1}))[0]

    del user_name['_id']
    del business_name['_id']

    review['user_name'] = user_name['name']
    review['business_name'] = business_name['name']

    return jsonify(review)


@mod_api.route('/nlp/review_analysis/<review_list>/')
def get_review_analysis(review_list):
    # review_list = ['6u2kVOwrhsSiXgrE3ia5kQ','2VWmcKFnAZsfetodc1MK4Q','u17z1w1UFyD5tRtYYJ4kyg','R2JQIU_0egEOKvozmjtuPA','7P8PDDUEfxz5lXUpqFdinQ','WGrFMrUn-EtDHvv1BkPxTg','-AtYUAis_5kHUXZVUknWog','6gVKH9lJ8iCcnhUSAs-gfw','tkNXGVjSZr4_ACeIr378Cw','8g0ZL9CHf3c2idCyH8yZsw','eR1KFVuDTPxhrgY4eNoBsg','cpBz3aLDrXBDt7AT66tttQ','XMPgThCKVd0xT6uKbYJOXw','Gl1vTT8ym_j-GBACcSVIaw','Rg0Ihyf01lT3ibRBedjsjQ','3x_C03Nef1RgXMqyk5labQ','8dp9N3_NMCI_mgLsbFIMMQ','jn0nZ82EBlNIeNscN_y1yg','uEsEWo5u8QQR98oxQh3NXQ','Ogbf-WBYbLvYfMnW5X91lg','kZUfIp0IezGd6k4jNIxOCA','wwAYH97zyyfhCsAVh4u0ew','_BIJSq5w-NOHu0gMEDzxaQ','eR6p_YDSEQ-7vq3SLu6GTQ','BK43txkuWuE9a5278KLCJA','kq0rRTqXbf8vGb4AYPNqiA','6YONbF8JnEjZzdLlkPgsIw','CG7NbX0xhWZB7RVnZAHNhA','hyU62BcfgzbycdGtap3U5g','pH5iEF6pwENrMWk66dcZqg','CHemK4G36n2UYOYJCcyZcw','e50knmlU33M6W7Gj2ME0SQ','fyBAiIhf_70-EZdmtoK96Q','fL3RaOYkTNJ2C5hxIUKgIQ','iniwUheGGLY4uCkMGQeDqw','etubXPmhZmNX9xNnp-mwLQ','hg7R-NUHva20LqjYcnnu0Q','SDESSIK0QsZ5q-pwxWXfRA','HQXfUykk1UsrKohooatlGw','a5b-lhTU_QGQf9X5TgiYAw','-xuYLR6bv1uGYn_7qfYq0A','FLaUYQMoVzoUXw04ox6Hqg','nD8cOzZi7QMPz95E1-kxUA','y-qX7h-OSoX4sgXZa0gxJw','jxqTLolkDffwGa0pbcM1uQ','Z306mP-uN5oJRsMP7veRAA','pDR7t-DhtKePTdBzEGFdrg','yPNJaOS_waK_xpOXMRkpXA','Z9yD80_AUI3NeV4QhYJihw','B7zhI-HeB7OED2b4bm8INw','auQPmD04P_177T4L7Iwaow','s1-PfPfMiiwpJOdl5zFEvg','Zxev0PEQM9XZu5bvTL02EA','8QHilyF0zY8ygW6LhbKJ5Q','Oqed14CBAtfr_dwcvfiH2g','Ue9vezmIrfmIGGGsXtx02Q','7T3RMIhYrgDpDCuQtHSrJw','X_1PGvA2kpv0Drc-Rn1EeA','ygKiPqdPrrrnavAZ_7gDJw','GMV96pRaDuThVHTKXKGvxQ','6zbLZbN_MqxcrlWRgrM2yA','nJziSkuoobJJY_soC9wCsg','Zc_wgROC-3jkXrzvpxtzcg','ZXQLcvXJkmJgjvjOZv04Xg','kKIeWOMPumtmX_aaTpqB9g','npi_ZZCi4rRge-TDJfRetQ','0wJCY3pRt6zku1S6XKCjow','2ifZrjx5EgU0RJ6t-KMQSg','prtUHUUl59tqE8Uy6RR4mg','FdQofsujSaIFnlIX9XwcQQ','f98sR-dXOf-7-q_k5hDitQ','mP7SEn4p5CAmmAfX4s80kg','MWBwLi5gvMSrsaiBfOczCA','MZQ_HDjQUOJ_p5LY62q4Og','-DjTuuhIMrxIAxxD-Z8eSQ','IZ1Ul1iZrvXx0ab6Ak8H0w','ecqeU4_qas1_KpK6wvKfMA','V1BcD1pTwqdJxkUf-16olA','Vo1mA5mIWgMg83KjlYeAnQ','1yw_ogjelxzi_3idSWroww','Hpp79c4MkEsy6lLy-85p-Q','PIBFjhFzdJi93lncJL5x0g','xrZ8h2V66_ayxaQdCY3Iqg','7nWFkOSpsgaVk-LAUvcpfg','XGMQjSgkWzk2u-N2YWgEcA','kT5ohp3BsPxqeoMeZbupWw','1kLAEvW2TQnSMgVhb3yNUg','50i009i63bWulCpha7ibBA','nZgqDvj8-QOsxien77bACQ','GVXAWmWI0kfvmx-8SCZnVQ','BKm7p93YL7wTpyO1IGgitg','h7rrd64baWgsgE2KEZwtng','npkb3FpFvNBBaCcXZI5jow','P771gAlynnymVGaR01C1sg','dVQzGbIr6izvmj8ygLI4Gg','VhdxOKlxUR21uD7UaC6mXA','JDhf6flawUq5Obm6OCzNQQ','BzX30xVIp_UlqXPMkarv6A','aL404RtNXhPleojp_6-CQA','pHlhFn5CtUxyGGuQuMi6Gw','9b-x9rQRBmN8BxHduSHAtA','6xkxQ6Zx65ez8yIg50Lx5A','giUeGrC_tYOr3L3RJkManw','judLKFbzVq_r2S6Z7RBD9A','Il6MTsVkzlihx4hxK8f0tA','ZRaWZQTi1hxF1b-rK4kxSQ','Dyp39BjihUpyWrk1j1eMsA','upSSDCRonjGtGx2LzyY-ug','XXwwrqAcXaWa6v15Ace5KQ','01kBYzJR6OsId6bhi6E8YA','rnBna6aUx2W1QD0mOOFpfw','01EZ5GZOODuujCD9Q46Bvg','CT9iQxqgY22ejIIh3Hvdbg','eQQ9PYfxZpgMWLI2c5XlzQ','eP3b6xyul6WuL2wsmh9lUw','hjFg6dSjJjbrXQeidJ5jxw','2PZg9x89qugaptIfugM3NQ','4Y5OzvTcmKhBL5oRelKeQQ','qnE1_pX5YBxjYH4JMKq8cg','cXV0IahY0D1oIuakcpfXQQ','KLOAIlB-1wIbzOiYvjbIIw','Id8JIkt_slgUaYyzP5QB-w','XTEERnog9EmTUDJ9IpOHkg','EBzomXRTUXjB6BnAHx-qQg','avN_usTZUjeAVdpYd5kU9w','QeYG1umh07cVV1WgiVFmGg','u5EBoh3nRDmBP3P9PArt0w','A85-s5_1rMH8VwBov9da-Q','SLz5xGdoHTb_F4KY3HcgvA','HPOVo3wrNY6xGL8n3EFgbQ','HONNJIbieifnTCPu2nXpUQ','OhlQTaVz6A3FFIQWy0H-0g','wMSYhKHVKKJDYVHZWTjVNg','zVijmfbROPaC4BzJJceGlw','jrIPEiEp_WrGclEHPYAcVA','CbZ6fB2AcNPwuFnvUqMFEA','nRcynlKEGyVGoSuwJsfGTw','eC9B9FflBQpHgVFBLsrqZA','jlZIirXWk6nuKvMW35l5VQ','mWhR_elbBdNTQ-eEvE4TSQ','s9oCBjmP-iooctvWqksU8g','lop9lGeK-yJ1SY1cCwZG_w','uhwgvSzQmymGW8xInrpBhQ','GLpEdw00Tfd174FDP_N5dg','HQVkl2RZSrFQG16FX3d4-A','bOFh6GjkN5AFCzSfRepl7w','9ZqQyHDXQ2BVjwrNlUvBtg','TQhT60mFlkhdB0kAUIx-qQ','1JiIZqUt8Eyh6QWMVvlYUw','VeNkXKA8CQE8jADH3jShAQ','tTYkEe1i8TmrcvVplN7dGQ','z7c6gFcpZuYbvutdlPalWA','obls5Ws8vQL2cZaaYNxmVg','wjY6cpKGAYxULRZoygpjMQ','TqyRm3ylqHEx36-FAUvZmw','KHeSkJ6c9x2INtPWXCn0FA','Wf1E9Djos775KrZPd0jQIw','wSQ29MnYXOzqk78lNRjPAw','iEj9clpCHn-sD8aqdd1nwA','xJXgF7Y3kCOQDnh78nlx9Q','QWGY_BmT84AWTLa2TRlDgQ','jXsnCwJoSs_dmtZF2xrtzA','xs2JvpAvp_QnIIFqsURMJA','zm7bfqvkZJGs-amjJWE1pg','16QmBPmZKj9EiED3bgelvw','P0dC2ja1VlbwoITjx4ISwQ','b-o8LXzSeqiNkyHlI58P7g','0Q1tjrr8RkZ-SAohOFEANg','YU7KAAD-rNM_ulYdtonkBQ','Qqq18ifPrhyk2RGP0c29WA','p-z_zCPR9KVtYNGtGFauWw','P9Hx4MFvPF46TBXWFk0j9A','r80UEAxVXXxwJ3Cr3Rs8Nw','adcsAq7j6iIk6vL2c0THrg','lDi4cjiVT0S5Mc8Mma61jg','ApmACSh7aApshOV4zEiECA','8E-Ox_XCvy8sXA4V9XQP7w','gIXiGbY4phUlMQw-7MujtQ','NiaXLDaxK_9Ve5pDbUInbQ','SMtXd3FmXU62BGAjEuXj1Q','FenkTM9yvT5Pj0izGOcsYg','VK0Np28twKbFjgZuNxZMHg','5kV95mIaf0akkIbYYukMHA','FglzddcZc_NaVLaLm-eAIA','uzpQ1zY0XPQ6MV0GpygIWg','7_ZYWNcZ65DTwNxRKyLVAQ','B1xXZe_aHKUtumUhJ4066A','2tXolbT3VfcKWqeBKkLhIw','2NT4btWqQek6bN7bDVke_A','Q2byFp9MKKom-HzIn-Av7g','P71whXsncIXRyPdplmz2NQ','hS6Ekd1F-Go_PHHSo6TgGA','S5A7SzcLn7yOCGWbqNJyLA','oJHGmuNi50AGja2xM8iIRQ','vAWedNwB_o75O4963m01LQ','PHjYuyGrgMPcqmYQYAr1tw','bJEiZ1xQtvTE881NdtRv9g','DyAT44bjMhrPDApS4ldLBA','kebbwlQkEtWojoB-wXslgg','ybF3fZP83Hd5qqXUOQCEWA','Fdr129GnWK_FWuIAoFGvYw','pMtbZ7YGT6yehRPWo7fuCQ','M6KRTwTRRXQGlf2bP9DuIg','7kcV-uPaVtmoXJ3LiAud8g','wsiggqVzSvI03DmTQ-Wgyw','vHeNBBerJlLBBJ97U8zesA','M78NTn8ehiWkiK2lGqj4sA','rVQRlVd7kOTTy8yZv_bOTA','UBXV6TFPbfdShb2HT--alw','Tp9af-m1fAwW9OCW2WqFRA','C9Z3gldkEGDiSsnjKPDtcQ','gA3ZFDz9MkXiBK6Fl74O7A','Pbu3xQiPhKd55pkCIBKiTQ','z9LYzu_p8zoFhWuhsr3BEg','175a0WaLacXlJmgu3HsB-w','Ey6BascjFcGc3OyXwqhi4Q','KaYpB9rrdYS3H6VObddmhQ','ppzqNm_wFeQQHVnaY2Ywdw','gKf2uJ96GI9pMNjc51KMrQ','WnF6_Qmy-SO_ZDzOln8Bgg','GjBjF_5CBfqJonJCmk5nAg','80tKLQBl6bfEUTi5LqRA2w','lSvwjNiDkUrCxps95NWtzQ','aLFD-GIDe3B7BlrLzj4wMw','pPIz6pIxfWK-wmdQhrL47w','VRiPSi0_RSEK2jUU2YKAng','bmPpkmdFBv69LfxOmq3HSw','a2WnKlXE8g_r-mJI-U6-JA','wbO-WXvO-VwfKH-eya3ejw','BIM7ps3az3nXu0MkAFHfVw','g9EuS3Xf7QarEMWgOH9qTA','JzgM2c-DR1PVArdkwVhSdw','g_crRi8LzVHDDcpqif-PEQ','DbgYZgMoZZJrh09Ia7CAgA','i6Un0j4tD0w83mBbDZ8lwA','ezyOKYXwYxcQT4gm4BxrDg','X1gRiWvjOPZ1oBGVDnYrDQ','3N5iv1YBypyUkh0kcIcyAA','YjrsX7I6tmElwYtjb11ayA','brrx5i4Jvqf7oRHaxrD23A','5V-OnX4UY3lDAWu3v45Lig','CKD2GfsIzngJEYIZbvfKrA','KxW7cmRv3eLNCnDfY1pvBg','S48ikHGZqnMK6TtOv_mRCA','GvB1kla_66BDo7Bd-XoZyQ','3JI7FGCp5f8R_MfW5ZBFBQ','I_Gfj5IlJ6aS6wV4TdBypg','Ke2kID58cmLZnbdzb_IJ0w','rvsr-QM2ZGPrRgpBtEyeYw','WUjMKBV4Bjboq3gp6RPVMA','eUZ5ClVNCe9GUK7h_ej2AQ','Q9GEe_HZw5pNYlqCk9WLIg','fpOxerHbFSiAQArjVU83mA','1ZvzZEtk1whQRRS9cDttvQ','1kVsWIczEZ3BWzAYmmHWEw','lM2mZpsiKM4lyNBgOUpw9A','jGsJDf9uFTYhhwyBGSOiJw','1xvKK0DAzn99-D-2rWw-KQ','ilasS-F4Wu_CXwb5TFEGNg','QKftdSwfA6CV8V1hiqPhWA','FV_gKih_8Tz5xbqx6p190A','JFdE_B7ePpOKg2uxsaDN5Q','h-4HWCEOfKKPo81DzXxs0A','apcBvUpeUtX2QPM-_9h_Mw','dZJA0Dxq61rr7IU8i2ZACQ','LdeTKKf_0Rd9d97P1HONtQ','YC2kzMoH5pF3mgDLyS-2xA','3ukSAMNnwFIbf69h-Lnk2Q','QQVUsl8_Vpt6lFlfDGDQPg','Bb30tIAcXx5BGbjstFJl8A','PH1qYBQ3-6qO5da6yg_J8Q','TP605iyO1XOFIera1K4DEQ','jFY_tzpisVxF8a4bPFaLTQ','-71ZENuVqM6c6T6sUabsNQ','iigmTsgoyo0LgM1Djq3WYA','FIpXO9gh9FzqSiATmAVFmw','Hcu9osrnzyXps1mxHjHduQ','LVbJl64mdns42-XFKXexqg','tHRwtrWNcq1_lQAs-dc1NQ','QH9YkuXnHrElg5_hdKEKfA','Mb7tCgHZzsHHpBkUq_P7FA','xAg0FKcMpEv_ei7PxCil3A','cjPEKGAo53MGJIeKNdBQ1g','X8fxhNx1BJkOHYD9902IUA','wIKiewz1vsS-KxZigNQRwQ','uYUjJinvgfMLMW-DZvc2Xw','q416x1Np37CWSYnNyklHGA','Hojp7o4J3INujFp6o4KFmw','eXRVjydGFuMJQOvrVt-r3w','xZOMHjGOYlUAMaaRhk31ow','e7awCwytoyX3TtZVeBF5sw','STBSprCwRn3harEY_Wsijg','XZrwMeO2U2E_qxlFfxd_OQ','uGu5ttFsRasg90F1WGfdGQ','3JdpMHAKB5RT6M37CC7xUA','bmM--FBPxhKyXWbBQSAPqQ','cJSJl_GuaqtRVw3U3lW48A','xaD4mz_jwsTkM2PgoC8eqw','zbBudCKhq3muQejn9vjgpQ','7k9LQagg74LL10C4572-og','bXKtDrNE5rfIO1unzk-1HA','rKkZVUzmMsbk0WrlJGLsMw','GxG8Y1dr7ZiVXHazq9j_SQ','yttWhTmWBysPiGPn92OsXQ','mFsShZAj4SnjcA8Xph1VVQ','a0tSItegku8a5gMj6ZpF2w','KHrYbi9oMTZhfzIG6SnuSQ','6jZ5E80xZbL1tjqJR-wGkQ','Z3QndSwPlCce4PKz25-Yjw','XUvRuZaxqpZM9Mgd2tyotw','GPERxIb95G5EUFJSWIZ7Dw','qzhuyONn7MAzo66dgW4HsA','9qmOn8m-RNNxriKUIXwr7g','Ln9alfEhWhIqmUPk9owL2Q','GnoqzVxn8DN4l_eVa9C3kA','MQ-zfK2COPV_DHZ5Hb-HnQ','bxUbcuPR6ivT2LoTzaclrg','rJudK2AAdCrNv9neUUBvsA','QR5FaQb3DGOmhdh0x5An8A','g5t12J7i6VSzxkItRkIFNw','lCFHMeTNS9F5nOOVO6ifxA','2zsIJoDYmESvrQHqJm2ugQ','J4W7W2sSPuDorIWlpwxGzQ','vGoBoCFM730HxXagSNAi3w','DIkSdunx7Ql6kiK43XNq1g','OFmpa5zx2hNdHsaij1jPbg','jbHURfs3I7lTvU0D52LKOA','7E4v7LpNIR7jEDCn7Ed6xg','AUO18KzB2_KAypNTtOu2xQ','dE2Y_YUWx0Ezt7ePyYWYJw','sVnhuK1cI5xEbZcwliM7Qg','aRc2UcDIorlS0FFfiHb_1w','gp-Ykq06oXwSQkAiLuT9lw','Rab_QoxNajuL7veBfEyLHQ','EfO-unW68hqeyC4-iNra6Q','GTieyu56ESZ5jPTtYmfufg','jaybkM1dKYVv2gUHhRbWRg','JRptNOgFQYub5TUZJFxuXw','ecbWl_FyPvtfRseUf1-cug','Xb1CGTsTThtIj5DUYIhI6A','oxRPHoBrmCM-K5OrZ_p9NQ','MsgcayWvXGQAs44hVW9V-g','7C9V0-kXW7snoN_mh80loA','oU5-XshncGnjvzh1NNhdWQ','F8FxvD5cIssTunSzreh17Q','6XT5LTFb9ElABn3pbjv-7A','9Xz3ma4ISK4v5A2csozMDQ','2doA1TnWfY6qvFQWrg4yzA','H4B6LY7FAAPCu12O1xtjww','-OxSQ1EjVEGumRR_tiuotQ','EIxFjlCvZ6fFZ0y1_ysQ1w','dxx56jQ2KYn6ZHFfZyo_pw','lwyh_Sk4z3zAXPdgyfyC1g','So2Iul2bKPAHL06hAfeIhA','u32EW-aYCxxoQvgdMkxtTQ','ermzhOwHS18ugPNbpoNc6A','-vWf6WIpmGBg5e7Q3ytn1g','Jr0ubKQrOHEJvvtjSZEOvw','BjhDMPMgAWCkhfS-5TvBYA','rSB_vZKqLurkhFQdv0oSFw','IkOscuXpbbPwbmDTd67clA','kfbYFYpgGUTKrRqBAqUMuA','UvaUonzspAEx69XYBQNHmA','Eln5EWIm_qLUxm7t_WcB_A','SX013aXq-YqZVFgnf64Ssw','bxtt_sU9sWW_YQ78wsE7Yg','jRnPSNSQRUjJLPnO-Ky3cw','71I70N2h-5_JoY8pZjwC_w','AMEQfUsnNBOXed0TbxPbpQ','O6C4SQZuxEusjWFXohk1Eg','txUqteHt6wIrJAv9TLwVmQ','b2lOCf3vkWlQdPHBE6_qhA','bpas37Cb5xQ4-IjN29UUhA','4RhwLYeI_QX7P303JeaGmw','VQ4BZCs8DlMzyP6kOJh6EQ','7Nsw_U5CCn2PawGPf769Sg','f0jtOEV_Rn9LUw41hjWLBw','1xZLjhTv9P5pc0ReNHQJng','NwksEKGLlEPcJ5ZgPyTCcg','r9bWEuOZ7KbXdSh_J8dwVw','JuXdoB4nhU-5szPMEh2Lfg','YVUXoRDan98WIrj-KjeZOA','w18_RFGVw-ZJPOpiq53k-Q','RS5xVsUa6i27cFc8JzBL4A','oDywOD9PlcMhugPpfueT8A','qTehrzqBd75wTVSMb6VxIQ','68J3IYrT0LrT0OukKxWsWA','mlN3rFMAEEK7podNB62r1g','roAPanzCqK93V6Am9oEibA','Thi-CP9SvjniA6-u6MOoBw','45Hy8XRs7pIF-l8y-OpRzA','b2QgwPLFF84qHV1RdExjNg','Ra4FKHCbN6Jw9zxfwjCmhA','WyHzRjOCBWYpncSaM5y0lA','_Pv-2tdheNtLu2a2T6MNzg','hPKn-wvCqncuyzAxYKH5FQ','kIW1F_XOOukK-cw_Z4efdQ','kHJrjKH5NVwtY0SN6yChHA','YYW-iLzLJk50qPmhmtyung','ZIU04V-i9EHzAzbl7Ur3zQ','plDsm0YychkugnJ3t2DW2w','rkQHt9Jv7N-OI9Z3-g8EbA','ovd-Glnwl7AEu_vyAFhXrQ','3gKzFgIZcbaip585amhNwg','VdShaXfDvLXPevZdQA3LDA','viiQ97daTd9m3PRHURHCUg','e4es9uCEXgk63u6HiP5i1w','Sjy6EmTzsKgXSonz1nUi_A','MjpFdb1gvBYjgHiIA5_emw','BJr7vDooSxbqLxnrv8Ui-Q','n0Zo8QjjYCwFtPbpB4OISQ','ZkyWqdQBOlgmGjrOacWg5g','EcsrT9OHwq06N0Dl8hna0Q','_MrUyGLKcSHlf1IaW4B-2g','XdNZLvLGIWrhinkt2MlE2Q','ICevyMMzTe_qhnDrgeBalQ','dQOwB_tSTWQCY6EeQsZGkA','DzUcsTiKSP0EIZNE-nrU6g','LjlhYdM7dWuZ6Co60ZWMjw','_LvhswH7t59TkA1sxjYCKA','kFcZ2aNwNwF8VJbBQ7lFxA','VMEHVnKud-KIM2anRXoHQQ','Lgwnjtt60Kyoj3e31QfNXg','OlBRC8QclliNiw8H66MVbQ','cc-F36sku5R_GyNoWSClyw','uG8GD1b4uBKY3MI5-NYkrg','8voZ-Ol5ovGYBkkQDjREkQ','IUase1OJnT-9Yq7Q6sXWvQ','D5IXn3ZE9rqj8l_zlZllIw','5FrZN61b458MSfds0wJEpg','WM3fdCK8yzxb3lGZK0eaUQ','tOFJs134nQOo0_xfgxAx8A','h4s8YlDlxNpbwhR07rJrMw','eYATN-YWULrB-940hBa8cQ','xECFQmMLaFMKhavY9GBN4A','Tq-1M6sCFaSoQJ7wie945w','hXOUczJr0Xdqf2r_vPUSbQ','Uv6ZQRgjy8aTghNSn1TvBg','NgJJIzAUJG7BtpS3lgbVgA','jSbzjj4YyvSHPDKAFlNhjw','liZhMDdirtJPsxvsSfXFjg','Qe15SydK80PjMNGkGISuuw','e0_ZZSYmmq0-Q1WF2wHnTA','aOcLZkqz2eDJ6T6PiXIN-w','qTf64NsaTYSI9ICCso2IZw','3Olc6E55eMIw3IkyBlWrMA','T49bDaoabYTaQjRTli4arg','rtpW_DY7Uzr5A0xCKj5bew','PtiQP-gtgARNfaE4xaFcWA','BQq_C0wqLbs7B_twheMNfQ','e3XtGd-Yif5T0nEMg4rmVw','Z3zU2-S4Lp2aVRMMU-5sAg','YOswusJIaWu-vO5eKiTG2w','ZznoU29lILMGLIomKExXrg','O8EptaM77QdBFvvKZvjnWg','os2cH0K4hTI3n_TEFop8Bw','JG-ZGrdzUGdoyXD3qhmEVQ','Z70nP0fIgyzOtwCgxZZfMA','k3gD9jfnz_nYOiEqN4tSnA','91s0A16WkKNjhaicGHJP0w','OJKnGqC-MIYBbGy2jNQycw','a_8w66ejMb4TJ-E5GYdLQQ','k1NoD2Lb5cyPQxK-hwW8aA','6hxyBxC8oXntdKvAjTGOEA','bevySVojF_Fajzb8X_XEPw','hp2aYxKj5TvxVeGtHdNVMg','5EcF7oIX7c3WARxIp2VZQQ','ZY60_EF2-tVi2MIJe7mkhw','qWWLyYpHMoqoFadRRIbdjQ','rO8fY57rV5chmX3KgqzU8Q','LuJ1-AhkCgdV0rlrpRBzIg','qiQuoEoxXw33SI_GzbLP0w','E0JsF0FS1J9ew3nd5XxxwQ','LzHgd2n6G-xA04sA2TMBrw','rmlf45GGc4DO-WEgQ7EpSQ','ik63sB3Dm_aCslQLzsEq_w','jC7GOytceaUCHbplLGyUZg','5MV7CkXXF1z5QKSrJMBSRg','bFdEhEsJa46EE6OmOKl79w','z0NYhAk8SH2CpUkqo9nFvg','dWcOnZTzjmX9geREujaghw','xh8yRYZx-IysX04GucRCFw','r3FiMyafLAI7hHLs5M_hwQ','8Nq28wRd_OnEYHYLCRhFXQ','4y5WaxMChhXn0ULkISMIYw','wyv_7BjMEB2UPKWiHr6npA','8VgoidIv7iyPPR1-8riqfQ','hm-USaPZ8TiBY5boEqRVCw','bwV8g4zFFJdg8mjkSYzfYA','L2xZkp-nXuUD2hnwkOQRBQ','5cfK7HiIO_kGGCtUlBB1dw','9XU7Bo9PWuhW15QAgTDy3w','-BKhGsjTk5mxVPhRFCltjQ','_7qa7uVhRGppLRznUXYtpQ','kGdkYHzDX0UfiGurSbftbQ','t7F9NkFk1ifao32P-W-_Sg','e9d3f8CgeVBIrayPWuuK3Q','zGvmVpHX0dwG4grtTsmR_g','HGFVbHKR571CMavJ5lJWOA','W4DDNaK45WHkeTSXVtdTrQ','EGMIQmDexyx6fB35f7BqBA','jqqqCW3bfWt_yJRK3mdDNA','1HlKgBM0C3Eng6v8V_Xd0Q','G9l2HL_2X_IrNweVSnRB3Q','KLtCgsGS3d8ohHuMi8T9oQ','GoZXLhHDmPQc2g-LGw6-UA','5p7UDpsYIch8Sj604V9Qpw','WBxzks8q8vaeHgsLJraTOA','3aw1IKQvwVZpMFwQfyHfJw','5r1vo-q3gMMYfpCw2ZxJGA','ek5RnOGq7BiXn6fNkdbJCA','t5C8oBxXXob-Rs6rtP-n4A','qlg8os74--DaSEcAQ2OecA','PN5S4roDM-TctkNOmlXTZg','Z07DZkrCNClAAWICdPHp2w','7ox0a3VcxmvBUVgjRgBasg','kN5BvENxjwbm7z_lFq7NMA','AjnO6_k-NalfO8Cjc3V-lg','gJTQbGCMAo7jTqTSLyV5RA','C-sJukdUprQN846POm68lQ','SenRKkB63xb4rOrr8HYaJQ','NDy5MqDof3Ohxun_nreQtA','JjsUhIBDFq4fziEpw8ZhRQ','7zPSrAdkkQ2_Eq1vZePong','tCvAA6_e7sDi9E9sFinq7Q','lKVrK6BbZUKvw2gvep5Djw','7WxrGkpqHH0D5jFqMJz5LQ','V1TK_osdFbNRgDE1qXFRaA','ZYwvEtJ3-Nn4prt6KIG5ig','_uTHHtmmIUSU9kZBoLdFGw','41XzdWGioCo7B4Ee4HXALA','1GAsJcG_ZfIR-RMuSUco5A','_2wwygl4gnDLgNT6-9NyNw','3wJdgN_pbGs6LQsSljJpSA','x_iIGls4ulr1YMQeVUTsjw','r0Nj2gA15UGy6ic_Wbntyw','K9O-TKNgU02s_QpG73FPCw','MIaZMsA7YKwLiuQbhKUWOg','L28qnbixCrcI73gA8jokYg','r3tVAB8euuPG_7cVOB7DJA','1eXGsYmUHEfoo73QG3o6Rg','nu846Zsqv4BaobMQPSeBPw','GKkWZqrEz6Drw_lZB2JvQw','dD52MBdpTflWSHNNP3vJIQ','OY3ybCOJuuliT8-FuX2xew','tSnE_FqhkVD01wJRNoUhMg','wyQoD7Zp1uO9bcmRaf4cvg','B683Oe7Sdar66aW67o38vw','Sv0PwYZjKNnq2iyKj01W4Q','hhWnst360XR8spfZU5ZJww','BWwrzsVLhJSyQas7gXSFug','fxKlJh03XG6GezoLc74ieQ','Bl0FZnwRzbFR0bTnJ5dL_w','11hU_53D_1hrlpXmIoZQ3Q','Z4n_ModjP2GmIjuDoFam9A','-YEJTQiw5UXcehVj4y_RUg','K4NK6oiIj91GTDmtVGjB0g','gYdjHp9Bi2L-k76nm2pwPA','WoPozRroTFdpwjFaTxJPPw','9yO8i389j73MXGr6i3Nl-w','5mfJWQbstmJPNU_TjzbGcA','PMuXlkkTPkVJpR8LfWUDmw','k7KsRWcQsCTknzWi9rMB7A','aK_3deeJ1EdkrXPeNWQ_SA','feD-0biG6h0f8c0tDnacWg','OyAuZRZAor-fHiyaBXnlYA','MNSDq6QcXBVjJ-T6mIte1g','F5CptHzeAyImEqNBjo7uIA','Qc7t8vpeFq9AfB0oMQUc-g','M6psj_aCJccRonY59HrRPw','x1nHsE_ktFZjVIYbASHt-Q','KMRVeJlewUJf1xQHXMWgRQ','tHKvyCTXsB-Aid4AMPFMYg','TKWlIxkQSXvPVJUG-xntvg','ma4M5UAtVnSWBnzIh_14oA','_MjYuyW431WawtSn3U37SQ','RV6UnZkVjZ4AcgpUSvYSYQ','XMYxoyJ8LjfjRO7v9C6jCw','ZfN6HPs4pPfKcXd2kBSlZA','Xnzi9dPN_p_jc7qOKVPf0A','mutKx8nYSocEAr67tI2EmQ','n0AgD4YywpWV81-S0uYeWw','UO5ixO1r7gN_rAGtMFlmxw','uSGZ93TSCgPkZuZOtJi9OA','_416rJ8A5hlI3TyUtt4NRg','_0J-janqHcm6PJiysVV0Lw','RmXc-h9gJOCq4zYmsZcXvg','4nuLrjK3JzASMdz4QZNHpg','u77bjQKF3JEg_Si8zcChqg','2_1hiFmSvy2P3dNYgC0cYQ','vpvqJldWgTkWPImFNL5P2w','kS56MTiCJe05msZdyI_V9g','8NA-F1cm9KkkV0YV3bsJ7w','K2rXNJHb2P2Np6LYtobvMA','h38pXGlACXHVqnwDYDtvHg','4YW898gLbzR6ltzlougTaA','pjzdVugDwHB1N-P9AXbVJA','juBtQFymqtUpocpfmkOjkg','nkOYcbgwde68-NenTNBR7Q','oHchJoTkQKLOTx96si1CiA','6R6cVX5l1BHOf8f8u-x6ww','-FjkGuubuna3KazQ9sCGuw','Ri8DQSB0KZ5vF96OpeThrw','uzNh2xB4lTWyQWjIrhCRhA','qJdUL-hTQiDN3dn1VR0UnQ','s--ncKemmF9Q_n2tZj67Eg']
    # review_list = ['71MbnyELligWrcZSgS0jDg','CMr3fWjK-W7BEqKdVnZSYQ','rLdLYPQuLwT6w6v4jQRdtA','q-jWkQSwqtomaEBt_dGJyA','gtBsEQBZDaAEXTss-v4RGA','cs6x2aF6MyQspF0mI3A5-g','s2udGl7wZ7SgFVPq9wGL_Q','Rqyq3QsgnGyZmhdgVeCT8A','COPh_oy2lL_PK5qpfFTUJg','qxQJ6AuKSZQsz3PDFm1DfQ','Z37dLHj0m7VcsS40kIn7BA','l6FriQ-EEI8soin7qhJ5RQ','cMsWLtBllUSKSmUyL_bwqg','v3ylS7KtdGE_-Y9DhT589Q','ZhF8rl3yGnV7hDsxycsV1w','DuCLA2ohpRhN0aBq7mL1Mg','Hu2S9WUPqO-CdLIeJF9Nyg','gwskB5Nc3P2l_Dp8FjBfkg','YJrjuZthqe2v_M9dwfYxfA','0d7gU9c92-xBVTKSjDej4g','gL_pVr52zs6iM0I5bukHbQ','uek33g7JXQ-SOrPTd3X54w','iRgtSj6J1NpUldXKvUVYhw','nd80RJIvhUPP6igCnBTw6g','ZzqlfoUyEPZWGAJnyHjn1Q','Lrn9gmvXNeciY3-egvRDwQ','l5AldDesx93mufr-kzHfbg','ikKDcbwM0bBoSB7z3rBRew','r3_pXOMRUDgmx0P1mxC43w','W4Vjite2HhyhsqqZu-uF8A','9bdOSsFUK4pMyj222EImDw','9NmrTvl9rDCL-w7MY7Ht2g','Ea-XzF9Y8dDbiRsv8MKuQg','0IWzlzD7f1EEVr_e4BDwIw','0aQ4V6WfUQtcncF2hbs2SA','8vCLfTPqe0rL5GmHSmnxow','hTyjercEYDK3fGnKs0TKiw','b6jUkz7hj5MU35nrBurO6A','dZVudoUjtt_RVNxpZ7tF1g','0RlaQkd1zdmLWTb4Cn5BXQ','or0dU9e53iR_UnFDAA0y1g','B84jSser02PWhmvHwXCjmA','3sHCvlnVB-JIiwetheER3A','aHBnceh5grUz2Ai_WjnmBA','YXTw2DYTfQW4C6_aGKwkwA','1jmvwqMwBtJL3pSapbO-RA','zUDrq8sqZKaWw6YogBL5sw','f8KfKcEjd_q7cWSBPAQXNQ','DK0Sc3lMNgVNJnLnSZYrvQ','ccfv68Dd9Zv9S30PU7wNLw','-BVYyYHP5M5cXLvhNNFhMA','zqyv346hpxjkOzr9NJsKwg','PKF1XgWkhLC8YtXzMXb3Sw','ceRzZ1yQJkqcLimjYnKoqw','-Gzp_89nYmwgC7Oh3lWCHQ','jUbe5imkx62XpORfYfeUZg','DEdBhrSkUoXmmI2rS1uZOA','qc_pu3hMbPk4C2ZtzyyP5A','XM7roqE5zGCMw_ZUuqfmPQ','ge5hE43pNJ1rehcwI05ecg','CiwcUEkkypJi17SitWKTpw','MYeYQL_Ao8BvFvt37JknGg','cId4nSlSaRrB0NQOCC6yiw','zt4ONkjtnDzWhUoofTQnmA','NZqkCjeEU8IglgX8ozJCaA','jHsNIPMn2CW5UdGoKHxFMQ','-F0pM6THbbIgdNflY2UKkg','L_XhCEM3wsrR7oHEBqGPGg','qy4sGHXppA8gtyu-ljq_0w','N43RBg-MMQIZCWdQZqbrAg','94q8Ll_UbTeQtu_VlZlE7w','dqT3G-sJwOK6SdyG90sRlw','v_OdTRnC-vslBX5idDEQPQ','vGv0I5dS02QbGGB_rBdyaA','AKdV16Kl1GfpNzM8x_QbHw','rE_Wfl-hPn09pDHDyOUPsQ','cNmYi3XC9aYxt2MBaaRW9Q','vHzFHXmNhPePGiZ-lHK1eA','V1gMJwlUrrg-bLQvrslzBw','PxxeKFKMnHHgD9kfUCr-Ow','FuugAlKRcqPC00uJ6supag','OJnek5chlBsroGgCis5bwg','jZgignyMD_8euwUh8Ol6MQ','w8RWZ_xEdQo9nLkHcaH__Q','pkJeN3B26mpRK8N1JWvq-A','s_BU-xf-ZvJ0ooKXyTudQQ','uB-LFm8Axft2ALYq0xKu-Q','T0WOH7Lxh76dhEXNJBEchA','U1P5ieH1LjW7PGggq9Eg0Q','GAvVYsVfySwMdk9PbSdEfw','1RSHaGwPW2NnyXoahB6u3w','dDLv5bMOhAyoWQookRZQsA','PhDHWlzJ0n7KgwHjl2ZlGw','K2sYyNLighX2sfPhRt7heg','gpBNOz6eIPGeFs-K6zYZ8w','-q26oCqi2pigL9-0AU-xeg','KROZw3_MeyaL7XX7Hqm0Ew','Q7Wqr2Q4d48ssPUAD7wl7g','z2QSEvszkyiBkFo7jdaE_g','pFAKiWEh6LzUJhkwXZR8WQ','1tOY9OsDRGcR10D5urWh_A','GFQR3jtXO72GwgZdXxbTSg','XKj07H-SUl1_fuvAv3ncHQ','Xy9ybDNhPmT95HBHdHT1eg','aAT-4pazSw2s7t2EH108LA','qAj4coniyq5ZDt8EJxTl8Q','lEWaJAxoz8xaw3YgzZsokw','KLPho011MFB-PlY64DPLTg','3daFfuVSJSxvI8rAvVE0Ew','eFYAJkZRn73_8i9d6swiSA','3PVbxc228c7b7X1zaBaq_Q','RB0Zyf4UhK97WN-fzk7LhQ','X9Uu9a8Ggc6Gh8eo6KeW1A','_87C7et2zWXPGNU1Fou08Q','TVNXdJRo2P_FscbpDrghKw','zpsiK0r70w58_NIR8IevaA','e38xxqWYQz-U-GJqNleMzg','IYjSSudK9mcZ2CFPTA4EPQ','3VonaM8ale-croFACPwgtw','p0uUK7sK9cuyqGoX44l5hA','m5OYI9wOiw7Is_1Lox5NLQ','Nfjs1QIpsbRWF_usu_6mQQ','aHFG8qlmIdGTM036Mpv3_g','o9MZgAsazngFUvIMpPexZg','iR27UVhxsV9pPiUMsQKSRA','KqudIAdId1KTZGZ_bKeJ0A','c2TtIUbD8N5H4ssaJUjRCw','2ol1DU-6ViK3N9A5jrRLag','k-2SnQafp_RdKaxGB8N44g','GUgmuHoH3PAVVbOCK9gWFA','wU8b2wIxABEpJCW0YvqrCA','u7a2fUZ827WMcFIwMbGzUQ','JhNt1wG9dzhx4qqcfZeODA','m4aqkR6NcgUPnCCieJYJ4w','ibULZRdCVWLgpz7PxITEjQ','__EUDNwHRQgZHWuyOB6RoA','Ar3vssY92uDe6-0_FnLYpQ','ZcX-0dSSMiUshcKMmn_dEw','BwaGSBXBTwRyNPP3raZZpQ','xZsTdcmEqkvL53nsHmK0wQ','Zk6W6D79_92Uo-_EoUKNBg','hz_J7kAyUifOj9OYr-K9_w','jAWzwRqfsoq7UmCfKXIaDA','CbBauqK5oVr-YkoiAjD1vg','LJB8oTNR0nqxV2zl6izPBg','88frJUjk3UB1_FP6pgSHvQ','zR_h69UH74DvBK3i96JA5A','xujLZuheOCJ0ULbQfmSe2Q','QN0ocjfqnVwFh1t8phIkgQ','3vZokWN6wxCTQUSj-ec6Bw','jnMPKDz3HJVdjPkX-MZgcg','7ZsTJ77zW0l7CucXDuyzcw','F8UMp5PNV4toHAZJAxkOKg','NccFg1iDeqipYVWX1zt2HA','-7HEaPHKsRmb8X9HtXsmSA','bLyylsTwiP3hejoRi6RB6Q','0_Dk4zrjNN0Fh2sQ5XKh5w','0hvJDNKjL7YEFygKJXsneg','ENCBnkvZPsgHBKh8Bodk3g','Ftie-79aDeaDzu3mkyAwZQ','oqu3iMS2agEzap-EiT8MFw','5D82-xfMIZM5GuCSei0FXw','Qg8Eju1KhX6aiC_5XqERjg','x1HebDdL5le30wvRHFJLxQ','An6EyxGSjcG9VNFS-Spy5w','l_fMT6eyZ49Tri7MKN680Q','q023hT8LJPCJIk3-trXyKg','Y1ao420VrXwE5Goyp2ELtg','_BpCePOOKOChPmutBC9uRQ','piovo6mwwgRWSJ-q9f0Fxg','in46cj2wx6jWKdTRTwqI1Q','cgJC0DsBstq8BPcnANWK9w','QBY7hkPqpWsP2_VFG-fcfA','6hNxoNjFoX8GNiJmeEIyDA','debY1HeVCNYQ9YC_ZVf8tg','ivgkzTXG_iSyJA9qfqG4gQ','3FAUN29Vf18I47-yp0ul9w','NQ73khdP4YhBTlY_HlMSjw','BDHr-xP-ML9qlJnkRRhMWg','END-LItm4j-YA3ftYiInlw','kdjNc0jEdYu3r7j-m_6l6Q','JIYqjvCUVTcbBVj8zZNgkw','nnIqcQmjVHHLLjP3RNnUiQ','N1co5wvFre1TlXKZ3Gob4w','-ntHheVg0Wsyt7v_9ESFbA','9xUN1sEqoFMcuU_0y_67mA','GQ-oU4kTigelb-g6wUYg7w','OH3BV51yJUCSOloC7TAAqA','1pVpPZnZc2xOdvOBpK7--Q','N8KLo_og_zOoYkrcQ-5BNw','feQMrBtNZ5B47vYT2LACiQ','6P9hDNlqBfzWT_68V_J9Ag','XtZFPSwmckev5Iw3IjJN5w','qVJHrk2syif8BOtw2-m1mA','zhlmVdGpbo6MDNPwKGNg1A','URNWZVLQnernHokI1reTZw','G75Wun_bcg2byv8QEfLGeA','J2dZl0amVR3G5l2gWxP-cg','tcNsAkkZX8bI_Y2excNnmw','jExtj5Z7DVIo-xYIbO9dCw','zVGgSS2eMElFIPlZTXDj3Q','jls0Ts-S0-5Wu-Ara3tbCA','dYgh_dN_EU-WO4Jsp0iP3g','BxwC3Jjj6CCTyZS7m7QmXA','2LXgGHBN-gvTPcGDuf8UUQ','x-McxODN8tiWiFn4QYLRqw','Z6kCWy00I7WJQYe12p3eJQ','suPBY--NH7IK9Z5_DlN0xg','Zgw7OgjJk6dNaBdttaBBTQ','kwqz6REk2SNnqQi2UJ8bAg','f-4AcNe-c_Jt_kBqFjc7yQ','y4EWvjX1Ga_QjjtAAlHSzg','QppNbzuMPbI13_qnF1gTPA','UwKw8g4CjRPb7h1mNvRnpA','UzcJcHJmbfh6C0NhJk5aHg','hrLLkcs18Of0zHdcadY_nA','o1k9NsrUp-0muqh2OGbU6w','CBBf6YKi09xmsQfiDCRWFA','aw-pH22Rxun_r3kN8Ixyrg','2u10ur2NrsEm8dzJfERNTA','kaoJxMTSgBixnYn1Syg-9g','J1REedKNnOi64YfCsHYXfA','sOLDPe4ZJ_qQOwtSZCXTRg','DdhkzDRKx71ZCDWc1Kfo1g','ZewkKF9_R1BXhOapF3R7cA','EOt4wrY_yEPeKl7WgaAT0Q','dfqwQQmTlwDKGmZ47DhTuw','VCnjVVqP1TuDqILVPkBrwg','GL5B6eQ4MiX6pORFYioOyw','YqR9WpHVmaFZ_nPopJoZVg','_RTEUgOuAJ8QrNMdvpijbg','3qx4gcHrBiWpycLWywKNog','5kvV2WWlnXd1rpTmy5JpNQ','QDZ_4bpgDxeQK4xQ903D5w','8EYoo46DN6iue5Bhb3CZ0Q','juQkRCYefUgKyFoAdB0zyg','FlaDw75DhDKabnR_X6NobA','LD0NIYqyoeKWIpygjZiJkQ','jARTBzb1UN-lYKpuZyF9QA','qd55llYPxs1MpGnj7uzsHw','Bkje_h7Tb1sZr9Cjr4UzhA','-rjzRIuYJrZuWkhEOx26BA','hUMi-26Wzei4yejhyeuF0g','VnvHoaDwSRnXpKENeKEUMw','IgeaRTpLcnPzitxc4HGUAQ','rtNdME117pZ-WQ5R_bE6XQ','cl3p8Dj655cxGjibU5xLyA','Uudqowj1ezfbK-wKYnnLSQ','XMMpikHCkJF3S52P2aKzJQ','gg3EtHo5N8homuvZMwn0bg','VF-ihjmFoqxMbNYgkjgoQw','gfTutRyRQvJV03pjYdhNHA','WxrdDp-jN_76o_gUKfbq2A','CR4KD0AFXgn7SPNbC6_ZoQ','hSp-RWmmrpgU7qw8zVrg1Q','SAyLN3Xne9NUjf1zUJfXTg','wVFkSOIxpItozZQ0rr3eRA','uePWdVMeikWAXK36z3Ds_Q','vURJCfX8zRsnYdY-JNgGBA','iYpqxV1QE08UpZY1XhVhUg','ant__z9x_WudQ3DPX_gn6Q','uldjCvlfUL8pI3CpLZUzgg','RgutxdL4CFRBibF9FK6NZA','GWY23X1ASt2lwace-a6XVA','opWumb61TkG8Vyoa_sP-ew','2QJ3Pn7UxyF2KQ44peVt2Q','jyAt3MdguYtw1Q3Cl-AvWw','A_MTjLI-Rwv417GMMH6UNw','1Sl-LNqIFpzAgCUFTcEjvQ','hng01-HroqT266KApRaPFw','T5oPEWJhWNKQwVQBy8bN0Q','S1ClSvedf-ru6nYu-ubc0A','eZMGkugLatCQEFA6MZPz1A','KvQBDgu1jZFcAml8FtzzFQ','RgkXZhp39CR8fydyQlT7Jw','FomPUnsNqsc-xckDqQgE8Q','F27mxKbTohBTKPRifGNGRg','rIyQJAfugt_DvJRGDCV9ZA','7ajYnopmTIuo8DlBHUAg5g','KNKoz1cDj6GxcV-hpdcl5g','7ktQYNCHcWRQvqOJkJgFKA','hmHnr5yWxRUTxFx5GxAyLQ','e0mmEvlwoMMpuqdjFmrQaw','r2NogUpwZ3b8wlhNMWbtlA','m6cLb88YcRRc7PWMleuIoQ','HtsC0LW66BQUpTmJb15bPg','Tum-bR2yz02xKfiZeldMpA','un6pENBSxM-vamX13SoCAQ','LfIpc32fb4K2t5yQhE2VzQ','5LVg9_jiGEXA7SxYf5eE_Q','I6Bf-rML_fwEZ177xvsLxg','J1cxQirorkXB_najPi9S4w','nLaeOFJ3gfPVPetbmrcCVg','DmkV45Sz-PSog5106KRDXQ','HwNmd6S4lfS-WCU6xDMBEQ','kh7OnqYOTCJK5kwoNFeB-A','skgZgGGDQ8RV-k_AX7Rscw','AyPqzQ5NeTosEHCMvvWKew','o57zWwNjxV9qxHsOEI4law','68WcRUDAhCOrh2pu87Impw','_kIbakTbfJMNKyb9xoorxQ','wagZJcZWksjsDMiQCPU7Pw','T433x4vnTyoTEQEDR2d5Sw','EhcGT3I8eggw0HgC45vqqQ','HitxExPdX3n0bWJOJO0jVw','10bbgYmpDNvntF6007Mrnw','bHMDFDe_XM0Y3dSG_tlxYA','lbx_6o4xxgW_7LgOVZvmgw','FS8KWtoFJj8voU57xKJm6w','ipvfDWb1TfFO1RWq_abgSw','E0LByF-nirbGS_3fYatFmg','vnHki7t42huUjhIhs0i3lQ','X_Zr5USigHmxfbFhr3x2yA','zhAia_9hR7KfM-mX9497VQ','S5MklkvcIlGRath-ugC4uw','Kv1g7bWi4_PafVIJ-_lo5w','fnV14emATjaYViueKqZP4w','3QdFx2BveMjnUIIKX_dosQ','vvAHPa8C9Dv3UM_0218lHw','7bTzLdTS4V58Va5AdAnNNw','xDU2EJBEFegnRtXDVR9ukA','0_RgLVfRibGU20VipVWgmA','KaRYRn-davLKQHSXCJk2tQ','tecl3QpZzeJYlPdgBq8T1Q','Sj8vgMdgAD_ibWAUZQtMnw','p7L7p1I5dnoKVnbUtrp74A','4b9KRXTKKiFmrSxlkl4xuA','ejjiW60p9lGSWnuCPJKI1w','7lH6TTns2CQ2Wjsg43p_jg','964pVR5m9rlXld4Wqcox9Q','jll6xVcdzVpqAgx7n5x35w','zIe2_DOQ_mllCoONzJaLuQ','FpNkLZi3VAXKs3E49R0AMA','I4hYT5N6rzh7dAOOquRw5g','SrMI125hIvhgcalAa4uC6g','8kI9ciCFzF9G-TX6nk7oEA','NTKms2GzwW7NyC5LqabZkA','6nh3IAAfDT6OX9grDwb7Gw','uY_2ilApu8a84lr6n8EgkA','M0kaIxWC50omwYz02aI4xg','5V2WgJB1anYxq1z_E1sBoQ','t4ATJdaFKaq8kZ_XFJQK5A','iWy6jRnoRw1i40Ed0JJpzg','2mvX0rhZQPSSITYaJthd6Q','1gXaeZ-F3zg5g8s6JzjQOg','uheCphbOr0ir6AFgvk4Kug','UkzGi4ZsnJ15oPhJ13Ppkg','xejgiQxrBooJVGF_V3ta0Q','i2XmGSbWYNPl0UQSZLwm0A','IIrBqmKjd-Tl1yM3sQ7UbQ','V8ZGGxomB1o7RVLTv-DxKA','bRczPDAzeh2i9WeszFDKIA','shkUXEIOqg4hJJJM3O7ZuQ','2pVRcQFUeQQs8ridlDS_cg','3xlASzFT8ahR2aipTEbICQ','OhgYIdavjzWcSfeNO_ioRA','EL52rl1FOG33VwWYww2E1g','hNSPznwgdpk-iJJ0t6qERg','DYfqX60GyUhJBQeURWzBcw','wE0kPeDHxOgccKwPGJuZOQ','7P4W7U4wntL97R8m_DJvpg','df2QF96eyz-n8L6AuhcwdQ','F_L_I7Lvpet1q8l95Hk8BQ','p5sVn2RkxCdXrau7kIejjw','HzQsAEq_WS2iD8ihs5vn2g','06vMg1bU3_1qUryOYbpqsw','b5TBpHkPTODa4FtWoQIL0Q','EqPQZExMIQ2VTIYDnvenFQ','718tx7COXEE-Pn-XZv9FzQ','j2LcyrzGd1T1oiDTr6I68A','eYZm27CnfNRECfe6dQFbYQ','vcIBXeGkQE4Ug_AkvYy8wQ','Oqt09GAVa4ZA14v8K57L3w','lSa-qDMncY1fbZmOqAtobQ','vnazvx58HAKgBHAUToeE2A','OxUF6baX1y7j8GfL68-UzA','r2efR3r6sKY-VQCfNSFEag','l9sBBsAuJv0Lyfd70CxD9g','W-w1jKxuQWMUkpDVoZWO-Q','-ugj0jfzGhs_3yF3ACpAtQ','w_nAXR9JVC5o-4MQ30Efiw','Cd-iAA1tZ-KNvo5ISa8Wfg','QnWA20JpFo9IVoPrN_YBuQ','JMZ4462qJV-86EZTxonoQA','GwKlCM_slMY_CA5Rkvj1ig','iAqm-xAdifMsB1tlA7xI2A','na4F6cCpDB1faDKUU5gbLw','6h3Nn_hg4bPWPkjCQsfWCA','YUBodlinT9XHe_w0pObAuQ','KvG0Rs2F2ltSIpu-xe95cw','pzi_V6yfqpPWUrcsOQcAvw','Y-kHXv8FCp1dRVzPv6I8_A','_DnEaMUERO6VsTLcyVJksQ','l3Dt40S6Anbz_PV3NDbdVA','f4oflIkanjdtMaIpqfNrjw','ueBLhUMDItvly0eh-HYiPg','0cwrlla-zJE2h5qoLFv9fw','D8fGOOLyxjIR_bBwhxxVpQ','4hiKpv10X2bAmKS2c5IzPA','6gWFnD1P0-MnodLmTLcdBw','VZ4AxaDD51zJUuKEy9sXIA','rcJd7yRwkDEBlma_obUyqw','BoqWI6Ht5mKGGkRQ-DTeSQ','zUZBForzTKN-Yu9orpl_NA','XAmX4HhlrZ9gN3hsflxfBQ','tRlbVIMxT7MNxcnkrGVhcQ','g9J8UFfaTz6aU9JF3duBbw','T9-Jem315wrLFHb7UNneqQ','kwbSvt4wxAqhSIJgUB1bjg','xvEUY8X7tAl4Zo5ElrJ8-g','hEE56iOtdVGsdZQydrYngQ','AiaXo0LVlceEsXyBq6BgEw','_ztrd13ka8PJOSsOVZAhdg','i_St0RZBMC8LHxIVLBaT7A','_2SZULm5VhAbg5Ar7lZTTA','9uRSP4Q5vGTxRov_wdMc6Q','V85oLR_Zl1xfGQMpaV7K9w','Zfm0AhgqQQ9riYi1N3b2vw','M-o-afhCO6GXWJyBnz56Og','S3K5FA6KmG7CTFptm4aRNA','aiiSLAkUE2nFTylTQzrNhA','hAUWiQ3ksqHgnfHHbZBRZA','tQSlWxBA5JECGPpvcqDhHg','gGLCXSGMlCkGoUrKM3at7Q','WkPbRUYS08WRGXDbkQ4gLw','zEcte7_L9V2bSZ1uJA4mUw','OdUdEMGTbQBC44cB7EXlRw','KnLMeqTsouFEHQiEclhgSQ','778nWkbpjVvuoeJcPHdPXA','16uOb0dJr4w8QJD86It9MQ','c23ujY13-M19P2x6K9xiqQ','fkrj0gNARygD672XB1r_2Q','j6krD7SHENTwFzkmNLG2MQ','5EjhZQOAV7CDrUciS0YR9A','33Qlw0sd56DCfeChphOUNA','p3hKdqRxbsEfUvvB7dyRhA','_Sse77arz_BDqtAph7sKTg','0ozwvxtEg3MSua8raAvWzg','-6hmCPfqnNh6SFTRJv7wZg','IUuBJg2G6kCyyVIAjIpxwQ','RLpFprcpDV3_YcdwaZEc_w','QC8Aesy6_Xc8NiJAkhecSg','uf5n2gN3fprMfQkUbeYaCA','GqP-EvPKKPGpThTNW6m5Ag','R9X_6hcuzgztYotm2Ag9RQ','rz4m6_H_rTfUcXqo3gi6zg','vgJnxOs0b2N4nv8lfqn4Yw','Z8Q9TBxmuesMqLc7cLtcSA','HJ68ELsnJfvbhpIyB0U37g','pYYnz5SGraqgoof9bwvHEg','8MwPq6YTFAyRQ4kIo6P9GQ','sgYHOVOMRSwYNbp4c4ohOw','QAuf6IGOmc1r-jigW2VIEg','KJhp3nkyOWPwZ_9iAzVUhw','Jhhn_3u-SKZ0YHrpwKIQcg','clAuz4cVMgQwsybn701Jaw','Ka9O6fL2uD9GML-NErdAUA','YsRJXQWT72X-6UfgUjlGKQ','WgYF_4OUXOUY2KJK4bTJPw','jWP8qXPR4QkgjQZmIP5-SA','ZYbk6mjqvi6a-C4D4PTLqw','_EcO0qAEFun8hNC2BEh_GA','y5Q8HM96E2RZwHoPEPd7fA','JRHVgxB0j9_IEAq8w-Modg','WXH8Bsxe9hBbLuMsyIw_bw','WpO6LAyAmxIwNSlCNW4Q7w','ArGv6YuDRB_UlokAtXvEWQ','Gyjs7ZbcwyxRWFT4QRPmUg','Od5nGxaf6MZdKfE_6_7pqQ','b-5lzhpzZGtu4_WACHxmbw','OwUZqSvMHQqe4VB5tZubag','RFo4SCu7jfaI5PEY1IxiLg','EJFA2PZWGVXZ5__Gl1RMvA','SRR120SlIqm6qh8RLAbXcg','kqJpG6H6ex29IPUIx9Zeog','HDDr9E1tia-gSU-GiaUilg','dIYVja0a84iWOKAE3xDFjg','yipDo3Giuf-B9Y4dxh9ZhQ','3DD0VD9bERbVOxJ2D1JUww','YVcYkAqYWNi8DKzxmxfipQ','deSdP4k6g2x3aQuVgkxF3A','DeUuUnTRQO5qoq67k46MZQ','m3XWdhV7arDtfjzqYG7pIw','jIrjUC92JmPKKg4y4Ncfsg','vFmxc0LxTQh9sLF5SBMhFw','ASXeHg2oaUqYsJ7JwAW_rw','6c35Rbb1q0XPWBsSOohEUw','ugUODO3MFcfKsl4NHv39Fw','-0RJBO1g6wSFmxdU-gc-Yw','LLDwzCn3xE3Fq0zv0Mvzfw','QYN2Lv9BXaWkODLjM8Fd5g','9glMH9vx8NPdDSTty1ZQcQ','zQujrVkc42YI7P27zBCJsA','jwnRjflJfyFmo1-5UlZQ2Q','L0nPEQhpcc0SHh-F4XP_6Q','90ZSd_fvegd9Z_L6CToUjw','KnQlVg3-2PD7GwVl4oII4A','vSmyR0yKKRBWd7uEFTyBCg','1Tu4NQUayBBopKkNbllWEg','9gaYI_jlEqaH6wWeDb9AaA','rp__uyu8une_Xogxb9cZFA','GwefBujijlUoOwrGYfis9w','ralkhMEIF8YVEe-LDhhBRw','i4Tboh4F5qVLVxuhomJBsg','8inU0QB88rtfJE7RQ-Kjaw','LdJ5XlC6wv3SCRFz4uusIw','ZQv8tWxUXcQ5VwPbo-xucQ','emA5ZpSdkoq4-aK9w4M3rw','wCDTMAaMH0dmK6iljhiqEQ','adcQKqoZY3w6HqhemJwBTg','8N3WLq1K4CEaV8Z84xtaig','zubhLuLeq7Wf0xhW1DY5LQ','5l1rLsH0-yFIHuIKhiILUw','XM06No6UAb6Coy8Viz2VEg','KIVEu0ZKD2XfPS0aCfh-Pg','rU0PSU0AL4HSGCVsdXnKNg','M4uhIQLTeAMx8CycqkTmiw','On8R_y0f1m1OLgqVn_pg-A','BD5PRTPw1CnYrzAOML5RIQ','nQ2v_dieiV5E2zMIaqTlKA','inatwUU2QHXNy9rhFLqaFg','yXnc6Ao-vkKJvSUQ-ASuwg','k4_9KWWaiiQUSxYwVTlpxg','cJu__2G24Apcn6K1KJTQug','4_6t_J_eqZdytqhcXQtZqg','j-Jxyt9x5jRspMNlSKpDBA','SALB9mL8a8biabpRE68eSQ','PYTXb_vbTBNY3HnDg2nv5w','d4IG5yEaB_tIqCCJaIGX1g','L8dCFvcueOCX8vKyxsA-QQ','SkPQ_AgVdqBECxts4tUFaw','dq4uIozT1Dk_9EpbvuVkvw','xa1eI5rgxpXKpCnVii2jag','lyv-ZPFQUQ5n4YX3vutChA','RAcaVBFTzPAIKsXxekqb-g','OpuML4UQmbSpiKcUNSzbsg','YRy0Nc0m-i6Mo5EdHAOBEw','7nRaDLXd29gCWAyfqL7WEQ','yhDZzXFg_GacyvcaRLxKjQ','hbnfaY2RJ64RAD2kjAo1OA','1kmMBJHxRx4O6Y3XZE8jzw','JLfF25VzidAOtRo9frjGVg','D3atcEErZ1Dt5Z5AggBRgg','f2LuvvpHOOWYThHyUlqyog','XgyLUi6G8M45660W-_MYPg','efsGktVnxX9f8bPS46gtvw','dtm3o7XgpEXR8MzjZ1AKbw','SRcoEdWcu6ygX6l5gyK4BA','2mgqJbTX1IPJ8OOMyb6klQ','5wqjaafSeT4jK2RZ7LvOBQ','OsUV6a_HwTKUCIaQNWc_jA','hPG6UTsYhjkXhiMQyGoSEQ','n3Z6rufZQNQlrmOZv_bdtQ','q9TfRWUH3uh3akHutbBSgg','nXJiVbqPkNoTEd-6_E-6Hw','Lhrfp4WZEwi4U67-Y0WKZw','q2tVxPHBlMrybHV4261JVg','SzG5tZVVm9bykGnEZvh-Hg','nCd4TNabYyfNxtLBqwvhfA','sC5Bv77Cca-QDYaqRjm7BA','zBNOeVjky4cwe3TrWNgT_A','i2Kh7TDPa5of2gGlDdZjxg','4m37xuiUnc0bNEA3MJAUeQ','fI3CBXmUOh86Bs3vIEv-ew','rZFOHUuE9mjpvC8MEXyOJg','9y-wkO7Ob0Mwbjo-FGcoig','UHM66uqGfb3cJhKlph__aA','Py3sZKSJkUe6mzHMHXN75A','Gly-nHyKqiwEcmW-OMNlPg','v1NXQmeo1mSY-pRXSuaI_w','fMfxeonxLMx0UhcOhcbTAA','r9O76liuoCPYQ3iRWSG2ww','R0_-BwdApmqGVml_kOrHLA','_gHXUvP-faak0spWEKEwCg','xe4ngsKPxqJLdPdPY9mDLg','PtkuvgyPOlxAo0_AMXijIQ','TMUkJOknnejZzNoaJqipYw','9p_6CCm42t2iH1ggjqXKaQ','tQDwFrwE-8wAS6MDPMdcWA','74Neh_M0TFg0UJqglG6TxQ','hsTsIBWQtOHXa01HO4UlTg','tbVoHEXGMIvESYaor84FXw','64bvZ2TC8hQ1qGeC_SIn3Q','lEcjaBPpsfiAVp_pp3HENA','bmB59QNxEjf02oJLfYD7lg','Nf-nAhBIU0KOunxEwJ1dPA','4wZUl8IuhMPHAj1kyrrNog','1Dhyq8-m4ivW1sU5vvZv5Q','w--Ghvh8kWrtnjzKvLAHQQ','8cMjT2qYTB4DmhLR07kFYQ','dU6nUVwnEuQCiHxuzJu1hw','gBC7us20gLUtCkzaaj2e2A','94pJYCu2H7rP_a_2vB2L9g','_SMfc-sK_Xuoe9iiY9mTkw','-4DqhTXiHNQAtF3MNlqxIg','jg5dngiown3D_1o2KGrvXw','v8hxzV1rSaQ2pdW7S3VgAg','KFCv2G7dFymYa5bALe2TFA','ouxNP8nQYuIwGGFHqyUHfg','sMvpmqMdVUBx4RWsZXwQHw','_5owejFPqHtzMt91b85i8Q','o2WFFkAN17t_YE5cOxu8Yg','SrDqkkRlFZqI15GVhUHoAw','8vqYnojxkQ_SOgOFzZ3yeg','Xt7zSixtYAQ3smPTa5Uzug','YhxZxORgRQErXaS1d2yikQ','b6Zlzb0FZFqWAJjN5VSYsg','H1qwAVCgR9uxaHQs9FvaNw','72rQCipzEQPG2Rsc9ns_Fw','NpEj7xdHM3Wh9uIasR5hug','3IkduMyyeIrq44eZ5fFvXw','ymWGGFlNfo9_tk-mMWZOkQ','iVPRuvwGKZ6OERg0wppJpw','kjdnh98_DWzKzPz4BkFmRQ','sIUBLnzzIccl5rPxaU5VYg','rThP2SZWyKz8k8_dRd9e-w','fZ3h8ogXcdQllwI9OEZE7w','Y8qGm6wD1MD34w6DpMlNGQ','5XqJU88hSbrFbgN0-tsFcA','yB_7Y9rR0zxPhroO_J0e7w','dzRLXoZQv9ReI9e6qnrnLQ','qnZOhYoQRT4o6u6ncqqgcA','RCTxDk-P42Piw3vyr3fWzA','pPTCpC_cGaXvN42LTwtCKA','W5oV2IZ0E_0X-EwC08aqyg','Phq3fWljVq8kRgsBGygJUw','Mguwjupyxhx5-96IYXnPrw','MehR_vxZnl091mE5cfTfig','Mi8O-8KilIG0zxvsEfUEZA','kuH9xZm9irzn0QV5UvySrQ','b6ARXzECw01Ub663wDoYcw','4H4hqljgNTbJsy1ssOCo6w','hAgrkrdxNUKdSYEOCd6lFA','otZijUrOaBn3j0-4VePVZQ','-vz3wJjcKz0TcObRkJnk-A','OjvLBcavWbxE07xgYV8XQQ','up0KifYMfvpMiABjt5Hudg','KDFxD4-c7pHp0aDpxOJOAw','NOkbfoC3AxC0BQJW7fnHqQ','sHUgH3rEmy6AaX6dABVXkQ','NaWDg7mIOR9IMJinuHL7cQ','TOjExSOIdNXYrRg6e9axNw','OfRWDn_oQsnvPuQ7R5h0ag','6jAI6FB2dTubo8qnxLY8iw','7RpBRYSBIHkqG3vSNzs2rA','qQj7kKflr-N6SB6FIQ0ccA','a4-6CEbiY5xhPFHqsj_omQ','0AIY2vMjHgY-up11mQBUEw','AXRev456jnEsi2mID2phaA','PID2BbABkS6E9WocR2JKkA','9wt8Q1dCOoyx14lcNieIGA','lTRYEwYXeNMBcoMrqSDSVQ','x7LtC8mHLahHjtq9V9MXzw','rMkvhcFwycncYHDTMjdEJw','faIwiYoE4Y41yNTwPZ2_cA','wVkVXgWseaCZJYdDWxsJzA','2lULg7o7TwcBh7uMEnIceg','oxJp87sI55y_hQ3HZ5aB5w','IyfmgDHf61WHTw1G9eR8Iw','Q9QyI4ZdbSGza0bh_ilhVQ','5-g-xtKNEnIx2C48os3R4g','CdMMoIlJ6uc8GLEEXxkGtQ','tAlYX5FO5QtDiSIpKzsZvA','tZqi5Y60UlKIEg10TJSUCA','BL9aPLtEuv3tWuC-hybzaQ','ybCA1hrbosCwyYVBqp5q5w','YDIqC_I6nkkDkr48QSxcxQ','4iskCCfCsQZxOm9KzKOwlA','4nL4AxVwRKMZuFAXiZhxkA','hmZfrlUfqMAz5oWg0HqZvQ','n8dxCvA25i1luspnC71WWA','EEC5mAL1kMH1PCS_6HeWTw','UP_bIiUscJufnnTjWJvV4A','jCI4cl74vgltDh-zJazj4A','Hl54T5iHwkPGBStYPo5mWA','52Z4ZwaB2YArmiKk7TLssw','7nei1PC1zrup-WvG-fPXaQ','vAtoUvAR-ulWozyf0y-HtA','1198Bi9OO7TLeg3duHL9Bg','LatOzgev_5-n5462VNW-QQ','Guj7TdN3_J1aSWgqj2O3Hw','qEcwC1KcNpguhg9v-3DIQA','BJsNgtTrytR7lZ-pRvY9CA','pdzPOtN938_qtwJgwHOEww','OaaDktBbxopy5P5qBB3Rsg','19c3a3TIdJuOGV4syBSudQ','uaf2qgAnyYlsleg9UeBqWg','-qv84vZjhO2QxHK-HxcJnQ','Mka0VYOlP3Bmlco-lk4OMQ','q712Hd9HeVRV0d3Wpat02w','019aEgh8He9MLj1r5vX-tg','7h9HQ0bMSjHj_0qzp-knYQ','lrkcK70_csDprWHWMy94OA','uqPcd2X7L_p4m9mlTSdecQ','9WZZZ6groGesKZkcS3kZog','NEZheR6b45eF7IW7uX8E4w','LfODc41obwyP6MSSIgCd_A','E71xLRKBX_gsplkGwWKW3g','pl7jNOzG94tji55DiCS3fA','k373FHBqWzqjUL_h6VPS0g','XFoSm2fbqlWMcvuAptCCKA','42p-ZW-AXQfb5y4G_oyjbQ','t6gRwz8aHqskSjwSLuO6fA','NdTmWGKppWGCqGvysApz2Q','PYvcD7McBNeqGGJNGb8lig','wVkcq2Ioy1azA3nQCI6NIA','cL38HEZEn4Xxx3AaU12DNA','UvCQ_D0O8r8mHcc7zlSXCw','gr2lJ0MlaSZMdoaYEpr4iQ','PISXqKKllhbW5zum4odkDA','-ubtMo0-TeziPK1t0D59uQ','wZ_Odp9J92ShpLEHrP-gLg','7cw2ohQ8N3b0h3g3aSTtIA','bGjgQndxni3Y4usssxlYeA','o5YWKGZjGHYGOtHHJVoBEA','x4vwaa78hHTiDe5njAbX7w','9UnY47aMqeDYmY_-qzHOlQ','Vi5BbnuHphKaGDp6GESmxw','NNQNxZ8gOIWphihtvkwmKA','qTTapetjIWD7WTtunas6yg','EcmUoP1poykr1jWXuFVwyw','n5gHvZgLZCvfgc43ZFi3OQ','-DEoIYuCC3hsi3NVupccIg','hwRTeIfKQ82-apKHuK5D3A','o1SWWCG7nOGWVsg44aULYw','RAPsnjkqqj4zDXFSYBK0LA','N0_Opd-vuxabf7uSi5PIdg','lkAfCfDkt_INWvmOu4e4ZA','SfcK8xxGBmHR9JkIEjgcQA','xVRBuv3G-zWHXoDW4QccUA','CLlD4w9f0a-mLHQNmwSuVg','x3UJLXJNzdejSk411LuY9A','DKwuPbCtgZaOQoQjLlO_jg','CwyGA2JNEjujnMWA97HJyw','k0kB4qtJybb8UAl2CMGj7Q','oVfhn7XpkQYNzBcoFDLdIw','qphCujb5l2kQMvNgAQOAZA','sMQbne4y35-DFJg7j-A8-A','xZGuyD5LhzYztCmbZwIcaA','nH48aUeD5ev7517AoS-4_w','spI3th6w3ryb-ILOcN7HRw','FImdYUTlUfqgh2Qm95A_5A','7gFngetYOxsO5ZpUr49k1Q','o0beeJSKY_AzA6fKRCLPSw','F81pAZQAfhl44QZl1a2hEg','jx4BEg-EfAzB9yGfyUiCvA','4prCFyI2mcjgvvSpWC8YDQ','E079xwPEzwaicRXFpjlJZg','txC80wRq1eAJnma1hJQatg','cibm2SOmtsHEqRmzolYl3w','E5Y-oPgksVBROo9rkw6_tg','aQM3xcnRaamIxuygQSByOA','TTnCU41a9DKw5NkynFCA8g','MKKIbykTxJXJkr-JxnFu8g','Xt7Qht7I9b3noTgruvljdg','fswZAZKkz_bfMQN8XriIQg','psktvoAVpQT87rRhw1k2qg','38Zu62cVP_3fby3dtBw2bw','MQ0d4moB9yUC2VCtL-uv1g','qa4ZhfGKZx6Nz5hQU-F1tg','5yymt40OSQh9BMWa2RzYJg','3ENRiGBPP3NngPwdJJ8l4w','LfldWPtyiBJbZKVO2Fg7Zg','lsUxj9mw3oldg9bgrnZSQg','mDGN9nIHqRbCG47xGh3LKg','_XMYRL67FzGTvwBctrq0fg','iyUFM86woGzz3cBKAc2mFQ','_YZ2tuNhKy0qr3TPzbE8jw','1Z32WN6YaQneVgutfnldcA','o9ujKKl1R4laT6kmTQfaBQ','n6ZK83A5kVypR3eh_Zq28g','zDdxRlkoY8L5iAeBQsOw7g','nNmmcwvgoc9wEmLrTHqE4A','UFLmbjHsD5lnPtWIJx3XMg','whWPLFR75wMi8MgBSHVIjg','-H1x6oASNoyUec7DpMzyNw','fpRJfRWC_I3fLCLbPKUkcg','wnNFdSMvAO38wv7sEu2DQA','Go3dtKpS7O-bHp76D5Bj0w','WCT1SQe5C3Vn-gVvdyj6Lw','-WPfTV_q08ub3UL0wdaYeQ','5mQoRNJ9Ktcxk6go4GW3LA','O2cRSwMKjLl8eUAbPfSoCg','5QrrxSt0UVb0F0sS6ia--A','fh_rqp3lOEROyoUXT1BcXg','LMg8hFtEMWQRuiXggh1KOA','ljD4KjO-gIeIQMu--LmS-Q','9p4sVT6Xn0EhLAn9U6shnA','BdYeqgH--jRZsaLl83FO_Q','l4W1OZP1fwulY4MIQZApFw','dRBe53W5ex9o8ur-XuD6iw','qOjqdkkzbEbmvVr2Qi4cYA','Dosy28-RG241MA5vFCqOVQ','9G0LC1bbQ6-LAIFwryWM7w','c-a6WQcmAHRFAq8FKz4aGA','ZDoiaR9FynAbHqyU1gg-uw','kVi80NgBotevJemxxBKZUQ','VXIYaWUSuT8PqZcWXOsWOg','DUil_0apmEzU85FTdyJgPQ','WRO0MJZuU5oZHq0BxQ5ZyQ','PrD2rBA36E_gHK-lbaIL_w','q4WCmXfDHNxEbYJbVhXDXg','UXpO9bllnsWnNjs7AsqX4Q','eK_-8gAXFn0jneidmi9bKg','b31jD6_q6WD0p8J7yz_rZA','bfLuqcLgQX5OcwKA6O3Vog','mKfGfVAdI1dylnBxSDP4Sw','BKdR67B05ImD7KuWM2bJyg','Ki6xfK_o6BM4YE_9JxwEfg','hR34m0KDLCs_PlRDWjVTvA','pPEfXlFlb_WUkX_073ifCg','CYGVRndQWnHGstSPzakC7w','DJefk3Hlt-qr0OJplVVF2w','a7rM_zcrPLktclzET4OdAA','NuRO54VUBed1dFItPfzX3Q','xFmcvtnAVgdk5sMmhfmrqA','bM6C4-FwZgK7ARC4ekyPDw','Cg4DboFxKyINJMqe-0vt1g','MHFIIDyQ00lZBJ3kOjpmBg','vXwfil13do_-VxJ-QXsnKg','RJtRhBp6-Mw4lVsyfCvrww','6pq_9sigZv8aS4gsJorgaQ','-U-19yEr_BsAZqXQYmSJiQ','E0fLbjYPeaGSxC5EfDynwQ','ggWBbaGmnGcu_KW6tcWsdg','LO_Lc0Aq2EbiCZ-JyjVC3w','ZuoQnHy2jmRz36n9fJYP6Q','A-Bsd_Au56NK5aumMGu9bQ','p-laRiBL5ziQtYpbf06dNg','a3fk7quOlfCyJRImGqZA4Q','8sBxPhponJ-e-PDWT44P7A','Zb9stqx1pYS0ZBlSWI9cxA','o5vYglrilXxVrFkfTYaJPQ','mSa4Zssen4n01xRoLu2lWg','XUUHpdOcaWGSDgpxjqsHEA','-xoZhkrBGNrlgtDTV0KWkg','IcPrOx7xajLat_6-q0iymg','zumNr5OC9g0NaHJt_tgjHQ','9zUbN97ChK01GRc_nf2XsA','RuOclgXzsoM_c6eHBBO8jw','zGojCsXhdjGQpEIm4vomQw','uCZC0XPA43hl_00H9XcOvQ','vn9Ekvo4copoG2BIgnzwgw','uysDWXm9n5CGyIJGqXWeuA','DyZP467FX7o6wSEy1qOmmQ','T5rFtMFaLpfy2RXMtSRTnA','-0pFD3LoWXWhRTv4OwJgZw','6IkFD7afbmLsq3xzLF9Pyg','ChEmIFOZgFFl_nk0ZYUPNA','UNpsd0oTJLMXZQSUxoQe1A','79EM26q_aFJoAWUgKGKVCw','n2rezjqXCNSa6p3kRQ8_AQ','b8MfkagTsmsVUttZDIxDGg']
    # http://localhost:5002/api/nlp/review_analysis/['1o0g0ymmHl6HRgrg3KEM5w',
    #            '1nJaL6VBUHR1DlErpnsIBQ', '4cDrkvLInTuSlBU9zNOi8Q',
    #            '4cCxazHh5DfWJ9eOcfvlSA',  'nslcUj3coPzFFzeSYrkqrQ', '4cOrGZfCKbhhdjZohhBkPQ']/
    #
    #  bit better?
    # review_list = mongo_connection.db.yelp_reviews.find(
    #     {'business_id':
    #          {'$in':
    #               ['ndQTAJzhhkrl1i5ToEGSZw', 'jiOREht1_iH8BPDBe9kerw']
    #           },
    #      'stars': {
    #          '$in': [1,2,3,4,5]
    #      }
    #      })
    # #
    # review_list = [x['review_id'] for x in review_list]
    # nlp_analysis_res = get_word_pairs(review_list, mongo_connection)
    # # print(len(review_list))

    cache_key = 'review_analysis_' + str(review_list)
    cache_key = hashlib.md5(cache_key).hexdigest()
    print("NLP")
    dt = None  # cache.get(cache_key) # eval
    if dt is None:
        # nlp_analysis_res = get_word_pairs(review_list, mongo_connection)
        nlp_analysis_res = get_word_pairs(eval(review_list), mongo_connection)
        final_result_ = {'business_es': sorted(nlp_analysis_res['business_es'])}
        for bid in final_result_['business_es']:
            final_result_[bid] = {}
            for obj_type in nlp_analysis_res[bid].keys():
                final_result_[bid][obj_type] = create_groups(nlp_analysis_res[bid][obj_type])

        cache.set(cache_key, final_result_, timeout=3000)
        pp.pprint(final_result_)
        return jsonify(final_result_)

    pp.pprint(dt)
    return jsonify(dt)

from __builtin__ import list
from __builtin__ import str

from server import mongo_connection


def graph_in_box(city, type, polygon):
    yelp_business_information = mongo_connection.db.yelp_business_information_processed_all

    if (city is None) or (type is None):

        query = {
            'geometry': {
                '$geoWithin': {
                    '$geometry': {
                        'type': "Polygon",
                        'coordinates': [polygon]
                    }
                },
            }
        }

    else:
        query = {
            'geometry': {
                '$geoWithin': {
                    '$geometry': {
                        'type': "Polygon",
                        'coordinates': [polygon]
                    }
                },
            },
            'city': city,
            'type': type

        }
    data_query = list(yelp_business_information.find(query))

    business_ids = [x['business_id'] for x in data_query]
    output = {}
    for business in data_query:
        output[business['business_id']] = {
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
            output[business['business_id']]['rating'] = business['review_distribution']
        except Exception as e:
            output[business['business_id']]['rating'] = None

        try:
            output[business['business_id']]['price_range'] = business['price_range']
        except Exception as e:
            output[business['business_id']]['price_range'] = None

    yelp_social_ = mongo_connection.db.yelp_business_graph_type_all
    connections = list(yelp_social_.find({
        'source':
            {'$in': business_ids},
        'destination':
            {'$in': business_ids}
    }))

    links = []
    for elem in connections:
        dt = {}

        start_pos = "[" + str(output[elem['source']]['latitude']) + "," + str(output[elem['source']]['longitude']) + "]"
        end_pos = "[" + str(output[elem['destination']]['latitude']) + "," + str(
            output[elem['destination']]['longitude']) + "]"

        dt['start'] = elem['source']
        dt['end'] = elem['destination']
        dt['weight'] = elem['common_users']
        dt['start_pos'] = start_pos
        dt['end_pos'] = end_pos
        links.append(dt)

    nodes = []
    for key, values in output.items():
        nodes.append(values)

    print(len(nodes), len(links))
    return nodes, links

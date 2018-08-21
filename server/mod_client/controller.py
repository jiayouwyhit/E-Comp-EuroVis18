from __future__ import print_function

from flask import Blueprint, jsonify, render_template
from flask import request

import json
from server import app

# Define the blueprint: 'dashboards', set its url prefix: app.url/dashboards
mod_client = Blueprint('client', __name__, url_prefix='', static_url_path='')
app.url_map.strict_slashes = False


@mod_client.route('/')
def index():
    print('main directory!!!')
    return app.send_static_file('index.html')


@mod_client.route('/dynamic')
def dynamic():
    print('dynamic!!')
    return render_template('index.html')


@mod_client.route('/getGraph')
def test():
    with open('data/graph.json') as data_file:
        data = json.load(data_file)
        print('getGraph!')
        return json.dumps(data)


@mod_client.route('/getVenueOfOneCity', methods=['POST', 'GET'])
def getVenueOfOneCity():
    print('/getVenueOfOneCity')
    data = request.get_json()
    tmp = {'name':'hh'}
    # city_name = data['name']
    # print(city_name)
    #####TO be done here######
    return  json.dumps(tmp)

'''
http://localhost:5002/api/get_business_information_city/Las%20Vegas

http://localhost:5002/api/get_business_information/dFmaYj3_cZpmEaL4WSOkPg

http://localhost:5002/api/get_business_graph/dFmaYj3_cZpmEaL4WSOkPg

Example tested by Yong:
http://localhost:5002/api/get_social_graph_common/t6ZIBNrQjvtwor8W-u3sUg/6PqYwabO2g1r2ZB7eImOiw

In Las Vegas:
Two Interested places: Neon Museum ("g83WbX_recywc4DEIZ-xug") and Mob Museum ("w-As0KSwy8pqMClOea-NLQ")


'''
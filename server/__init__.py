import os
from flask import Flask, render_template
from flask_cache import Cache

from flask_pymongo import PyMongo

app = Flask(__name__, static_url_path='')

app.config['MONGO_DBNAME'] = 'yelp_comparative_analytics'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/yelp_comparative_analytics'

mongo_connection = PyMongo(app)
cache = Cache(app, config={'CACHE_TYPE': 'filesystem', 'CACHE_DIR': '_flask_cache_tmp_'})

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500


# Import a module / component using its blueprint handler variable (mod_auth)
from server.mod_api.controller import mod_api as mod_api
from server.mod_client.controller import mod_client as mod_client

# Register blueprint(s)
app.register_blueprint(mod_api)
app.register_blueprint(mod_client)

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '0'


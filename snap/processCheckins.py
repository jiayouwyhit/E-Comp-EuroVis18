import pandas as pd
import os
from datetime import datetime
import json
import math
import pprint

pp = pprint.PrettyPrinter(indent=4)

THRESHOLD = 50
count = 1

filename = 'network_data/brightkite_totalCheckins.txt'
format = "%Y-%m-%dT%H:%M:%SZ"

lis = []
obj_cache = {}

def sqrt(number):
    return math.sqrt(number)

def asin(number):
    return math.asin(number)

def cos(number):
    return math.cos(number)
 
def totimestamp(dt, epoch=datetime(1970,1,1)):
    td = dt - epoch
    # return td.total_seconds()
    return (td.microseconds + (td.seconds + td.days * 86400) * 10**6) / 10**6 


def get_dataframe(filename):
    return pd.read_pickle(filename)

def get_data(filename):
    df = pd.read_csv(filename, delimiter='\t',names=['timestamp', 'lat', 'lon', 'location_id'])
    df.to_pickle(filename+".pickle")
    return filename+".pickle"

def distance(lat1, lon1, lat2, lon2):
    p = 0.017453292519943295
    a = 0.5 - cos((lat2 - lat1) * p)/2 + cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2
    return 12742 * asin(sqrt(a)) * 1000

def find_nearest_poi(row):
    vector = []
    location_id = row.location_id
    lat = row.lat
    lon = row.lon

    if lat == 0.0 or lon == 0.0:
        return []
    
    try:
        return obj_cache[location_id]
    except:
        lat_approx = str(float(int(float(lat)*10))/10.0)
        lon_approx = str(float(int(float(lon)*10))/10.0)
        file_name  = "mapDataOutput/lat={lat}/lon={lon}/".format(lat=lat_approx,lon=lon_approx) + "data.json"
        if os.path.exists(file_name):
            try:
                data = json.load(open(file_name))

                for item in data:
                    d = distance(lat1=lat, lon1=lon, lat2=float(item['lat']), lon2=float(item['lon']))
                    if d <= THRESHOLD:
                        item = {
                            'lat' : item['lat'],
                            'lon' : item['lon'],
                            'distance' : d,
                            'address' : str([str(list(x.keys())[0]+":"+x[list(x.keys())[0]]) for x in item['point']])
                        }

                        vector.append(str(item))

                obj_cache[location_id] = str(vector)
            except Exception as e:
                print(e)
                return []
        else:
            obj_cache[location_id] = []
        return vector

process = False
if process == True:
    get_data(filename)

    df = get_dataframe(filename+".pickle")    
    df = df.dropna()
    df = df.sort_values('timestamp')

    print(df.head())
    df['timestamp'] = df.timestamp.apply(lambda x : datetime.strptime(str(x),format))
    df['date'] = df['timestamp'].apply(lambda x : x.date())
    df['timestamp'] = df.timestamp.apply(lambda x: totimestamp(x))

    df['lat'] = df.lat.apply(lambda x : float(x))
    df['lon'] = df.lon.apply(lambda x : float(x))

    df = df.sort_values('location_id')
    df.to_pickle(filename+".pickle")
    print("Saved Data")

else:
    df = get_dataframe(filename+".pickle")
    df = df.sort_values('location_id',ascending=True)
    print("Loaded Data")



for index, row in df.iterrows():
    row['vector'] = find_nearest_poi(row) 
    lis.append(row)
    count+=1
    
    if count % (5*(10**4)) == 0:
        df = pd.DataFrame(lis)
        df.to_csv('processed_nw_data/part-{count}.csv'.format(count=count))
        print("Completed = {completed}".format(completed=count))
        lis = []
        obj_cache = {}
    
    if len(obj_cache.keys()) > 10000:
        df = pd.DataFrame(lis)
        df.to_csv('processed_nw_data/part-reset-{count}.csv'.format(count=count))
        print("Completed = {completed} : Reset object cache".format(completed=count))
        lis = []
        obj_cache = {}



def get_amenity(row):
    for elem in row:
        elem = ast.literal_eval(elem)
        address = ast.literal_eval(elem['address'])
        for item in address:
            item = item.split(":")
            if item[0] == 'amenity':
                return item[1]
    return None

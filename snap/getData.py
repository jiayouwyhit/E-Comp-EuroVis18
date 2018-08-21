import json, time
import os
from bs4 import BeautifulSoup


def write_lines(json_object):
    count = 0
    for key in json_object.keys():
        name = "mapDataOutput/lat={lat}/lon={lon}/".format(lat=key[0],lon=key[1])
        try:
            data = json.load(open(name + 'data.json'))
        except:
            if not os.path.exists(name):
                os.makedirs(name)
            data = []

        data.extend(json_object[key])
        writer = open(name + 'data.json', 'w+')
        writer.write(str(json.dumps(data)))
        writer.close()
        count += 1


def create_json(filename):
    json_dict = {}
    count = 0

    with open(filename) as file:
        for line in file:
            if len(line)> 10:
                soup = BeautifulSoup(line,"html.parser")
                for elem in soup.findAll("node"):
                    lis = []
                    for child in elem.children:
                        lis.append({child.get('k') : child.get('v')})

                    lat_approx = str(float(int(float(elem.get('lat'))*10))/10.0)
                    lan_approx = str(float(int(float(elem.get('lon'))*10))/10.0)

                    data = {
                        'lat': elem.get('lat'),
                        'lon': elem.get('lon'),
                        'point': lis
                    }

                    try:
                        json_dict[(lat_approx, lan_approx)].append(data)
                    except:
                        json_dict[(lat_approx, lan_approx)] = []
                        json_dict[(lat_approx, lan_approx)].append(data)

                    if len(json_dict.keys()) > 10**5:
                        write_lines(json_dict)
                        json_dict = {}
                        print ("Processed {count} nodes : Writing".format(count=count))
                    count +=1

    print ("Processed {count} nodes : Writing".format(count=count))
    write_lines(json_dict)


def loads(filename):
    count = 0
    written = 0
    chars_written = 0
    with open(filename) as infile:
        temp_string = ""
        flag = 0
        for line in infile:
            line = line.replace("\t", "").replace("\n", "")

            if line[0:4] == '<nod' and line[-3:] != '"/>':
                temp_string += line
                flag = 1

            elif flag is 1 and line != "</node>":
                temp_string += line

            elif line == "</node>":
                flag = 0
                temp_string += line
                count += 1

            if flag == 0 and len(temp_string) > 2*(10 ** 7):
                file_name = str(time.time())

                chars_written += len(temp_string)
                print(written, count, chars_written, file_name)

                writer_file = open('mapDataOutput/' + file_name + ".xml", 'w+')
                writer_file.write(temp_string)
                writer_file.close()

                temp_string = ""
                written += 1

            count += 1

def main_process():
    # loads('/media/hammad/6d8a039b-641f-4685-b301-5289e3e218ed/data.usa.xml')
    for file in os.listdir('mapdataPOI/'):
        create_json('mapdataPOI/' + file)

main_process()
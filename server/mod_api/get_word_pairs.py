from __future__ import print_function

import enchant
import inflect
import nltk
import pprint
import re
import string
from __builtin__ import len
from __builtin__ import list
from textblob import TextBlob

english = enchant.Dict("en_US")

inflect_engine = inflect.engine()

noun = ['NN', 'NNS', 'NNP', 'NNPS']
adj = ['JJ', 'JJR', 'JJS']

stopwords = ['i', 's', 'able', 'isn', \
             'doesn', 'only', 'sa', 'mom', 'other', \
             'man', 'more', 'months', 'years', \
             'weeks', 'week', 'year', 'month', 'time', \
             'one', 'night', 'fav', 'girl', 'bye', 'lol'\
             'thing', 'son', 'bit', 'day', 'sorry', \
             'visit', 'item', 'lil', 'lot', 'eye'\
             'fire', 'jar', 'restriction' , 'norm', 'list',
             'line', 'shape', 'ice', 'nit', 'vist', 'turf']
pp = pprint.PrettyPrinter(depth=6)


def get_type(data_dict):
    if len(data_dict.keys()) == 0:
        return "other", None
    max = -99999
    ret = list(data_dict.keys())[0]

    for key in data_dict.keys():
        if data_dict[key] > max:
            max = data_dict[key]
            ret = key
    return ret, max


def for_each_review_(review, ret_data_dict, dict_):
    del review['_id']
    scored_terms = review['score']

    for term in scored_terms.keys():
        skip = False
        nn = None
        t_list = []
        l_list = []
        nn_count = 0
        aa_count = 0
        term = term.lower().strip().replace("  ", " ")
        term_list = term.split(" ")
        list_words = []  # nltk.pos_tag(term_list)
        try:
            for word in term_list:
                if word in stopwords:
                    skip = True
                list_words.append((word, dict_[word]))

        except Exception as e:
            # print("not in sentence : " + str(e) + " : " + str(term_list))
            skip = True

        if len(list_words) > 2:

            if dict_[term_list[2]] in noun and dict_[term_list[1]] in adj:
                '''
                    Let it be !
                '''
            else:
                print(list_words)
                skip = True

        for elem in list_words:
            if len(elem[0]) < 3:
                skip = True

            if elem[1] in noun:
                nn_count += 1

                item = inflect_engine.singular_noun(elem[0])
                if not item:
                    item = elem[0]
                nn = item
                l_list.append(item)

            elif elem[1] in adj:
                aa_count += 1

                l_list.append(elem[0])
            else:
                l_list.append(elem[0])

        term_list = l_list
        term_mod = ' '.join(l_list)

        object = {
            'word_pairs': term,
            'frequency': {

            },
            'noun': nn,
            'tagged_text': list_words
        }

        for item in term_list:
            object['frequency'][item] = 1
            t_list.append(item)

        if len(l_list) > 2:
            # print("--", l_list)
            term_mod = term_list[0] + "-" + term_list[1] + " " + term_list[2]

        object['word_pairs'] = term_mod
        object['type'], object['type_score'] = get_type(scored_terms[term])
        object['polarity'] = TextBlob(term_mod).sentiment.polarity
        object['business_id'] = review['business_id']
        object_type = object['type']

        # print (object,skip)

        if nn_count == 1 and aa_count > 0 and skip is False and nn is not None:
            try:
                obj = ret_data_dict[object['business_id']][object_type][term_mod]
                object['polarity'] = TextBlob(term_mod).sentiment.polarity
                object['type_score'] = (object['type_score'] + obj['type_score'])

                for txt in obj['frequency'].keys():
                    object['frequency'][txt] += obj['frequency'][txt]

                ret_data_dict[object['business_id']][object_type][term_mod] = object

            except:
                try:
                    ret_data_dict[object['business_id']][object_type][term_mod] = object
                except:
                    try:
                        oo = ret_data_dict[object['business_id']]
                    except:
                        ret_data_dict[object['business_id']] = {}

                    ret_data_dict[object['business_id']][object_type] = {}
                    ret_data_dict[object['business_id']][object_type][term_mod] = object

            noun_in_t = ret_data_dict[object['business_id']][object_type][term_mod]['noun']
            ret_data_dict[object['business_id']][object_type][term_mod]['noun_frequency'] = \
                ret_data_dict[object['business_id']][object_type][term_mod]['frequency'][noun_in_t]
            # else:
            #     print(" - ", "list : ", list_words, "noun_count : ", nn_count, "skip : ", skip, "noun : ", nn,
            #           (nn_count == 1 and skip is False and nn is not None))  # , list(review['text'].keys()))

    return ret_data_dict


def get_word_pairs(review_list, mongo_connection):
    query = {
        'review_id': {
            '$in': review_list
        }
    }
    what = {
        'review_id': 1,
        'polarity': 1,
        'score': 1,
        'business_id': 1,
        'stars': 1,
        'tf_idf': 1,
        'final': 1,
    }

    reviews_text = [x['text'] for x in list(mongo_connection.db.yelp_reviews.find(query))]

    final_para = []
    for text in reviews_text:
        text = text.lower(). \
            replace("!", " "). \
            replace('/', " "). \
            replace("  ", " "). \
            replace("\t", " "). \
            replace("\n", " "). \
            replace("~", " "). \
            lstrip()

        regex = re.compile('[%s]' % re.escape(string.punctuation))
        text = regex.sub(' ', text)
        text = text.split(" ")

        ret_text = []
        for word in text:
            if len(word) > 1:
                ret_text.append(word)
        final_para.append(ret_text)

    text_tagged = nltk.pos_tag_sents(final_para)

    dict_ = {}
    for texxt in text_tagged:
        for word in texxt:
            dict_[word[0]] = word[1]
    # pp.pprint(dict_)

    processed = list(mongo_connection.db.yelp_review_scored_pair_all_not_final.find(query, what))

    ret_list = {}
    for review in processed:
        ret_list = for_each_review_(review, ret_list, dict_)

    ret_list['business_es'] = list(ret_list.keys())

    return ret_list


def create_groups(data_types):
    ret_dict = {}
    nouns = []
    for key in data_types.keys():

        obj = data_types[key]
        noun_key = obj['noun']

        skip = False

        if noun_key in ret_dict.keys():
            if ret_dict[noun_key]['count'] > 9:
                skip = True

        if skip is False:
            if noun_key in ret_dict.keys():
                ret_dict[noun_key]['count'] += obj['noun_frequency']
                ret_dict[noun_key]['polarity'] += obj['polarity']
                ret_dict[noun_key]['objects'].append(obj)
            else:
                ret_dict[noun_key] = {
                    'count': obj['noun_frequency'],
                    'objects': [obj],
                    'polarity': obj['polarity'],
                    'noun': noun_key
                }

            nouns.append(obj['noun'])

    final_ret = []
    for key in ret_dict.keys():
        # if (ret_dict[key]['count'] > 1) and (ret_dict[key]['polarity'] < -0.1 or ret_dict[key]['polarity'] > 0.1):
        ret_dict[key]['objects'] = sorted(ret_dict[key]['objects'], key=lambda x: x['noun_frequency'], reverse=True)
        ret_dict[key]['polarity'] = ret_dict[key]['polarity'] / len(ret_dict[key]['objects'])

        final_ret.append(ret_dict[key])

    final_ret = sorted(final_ret, key=lambda x: x['count'], reverse=True)
    return final_ret

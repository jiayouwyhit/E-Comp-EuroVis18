import pprint
from textblob import TextBlob
import operator

pp = pprint.PrettyPrinter(depth=6)


def update_scores(raw_list, dictionary):
    return_dict = {}
    for word_list, score in raw_list:
        new_score = 0
        split_words = word_list.split(" ")
        for word in split_words:
            new_score += dictionary[word]['average_score']

        stri = ''
        if new_score < -0.1:
            stri = 'coef_neg_' + str(len(split_words))

        if new_score > 0.1:
            stri = 'coef_pos_' + str(len(split_words))

        if new_score == 0:
            stri = 'coef_neutral_' + str(len(split_words))

        if stri in return_dict.keys():
            return_dict[stri].append((word_list, new_score, score))
        else:
            return_dict[stri] = []
            return_dict[stri].append((word_list, new_score, score))
    return return_dict


def create_word_dictionary(word_list):
    data_dict = {}
    for word in word_list:
        word, score = word

        for word in word.split(" "):
            if word in data_dict.keys():
                data_dict[word]['score'] += score

            else:
                data_dict[word] = {
                    'score': score,
                    'polarity': TextBlob(word).sentiment.polarity
                }

    for word in data_dict.keys():
        avg = (data_dict[word]['score'] + data_dict[word]['polarity']) / 2
        data_dict[word]['average_score'] = avg

    return data_dict


def get_nlp_analysis(business_id, mongo_connection,exhaustive):
    # pRlO48w4GkWEPEYIH2tHsw
    db = mongo_connection.db.yelp_reviews_scored_tempe
    query = {
        'business_id': business_id
    }

    raw = list(db.find(query))[0]
    del raw['_id']

    all_words = raw['coef_pos'] + raw['coef_neg']

    diction = create_word_dictionary(all_words)

    updated_score_dict = update_scores(raw['coef_pos'], diction)
    for common in (set(list(raw.keys())).intersection(set(list(updated_score_dict.keys())))):
        if common.split("_")[1] is 'neg':
            raw[common] = sorted(updated_score_dict[common], key=operator.itemgetter(1), reverse=False)[:10]
        else:
            raw[common] = sorted(updated_score_dict[common], key=operator.itemgetter(1), reverse=True)[:10]

    # pp.pprint(updated_score_dict)

    # score each word in the positive or negative list
    # update the new word list
    # 3 words patterns are more important

    if exhaustive is False:
        data_dict_return = {
            "count": raw['count'],
            "coef_neg_3": raw['coef_neg_3'],
            "coef_neg_2": raw['coef_neg_2'],
            "business_id": raw['business_id'],
            "stars": raw['stars'],
            "coef_pos_3": raw['coef_pos_3'],
            "coef_pos_2": raw['coef_pos_2'],
        }

        return data_dict_return  # list(raw.keys())
    return raw

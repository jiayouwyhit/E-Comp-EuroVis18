from server import app
import argparse

if __name__ == '__main__':
    DEBUG = True
else:
    DEBUG = False

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Analytics Dashboard Command Line')
    parser.add_argument('-p', default=5002, type=int, dest='port')

    args = parser.parse_args()

    app.run(port=args.port, host='0.0.0.0', debug=DEBUG)
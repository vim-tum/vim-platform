import os

from json import load
from .ElasticSearchDb import ElasticSearchDb
from .ElasticSearchDbUsers import ElasticSearchDbUsers
from .SQLiteDbUsers import SQLiteDbUsers
from elasticsearch.exceptions import ConnectionError
from oeda.log import error

# Ref for directory issue: https://stackoverflow.com/questions/2753254/how-to-open-a-file-in-the-parent-directory-in-python-in-appengine

def create_db_instance_for_experiments(type, host, port, config):
    """ creates a single instance of an experiment database  """
    if type == "elasticsearch":
        return ElasticSearchDb(host, port, config)


def create_db_instance_for_users(config):
    # config['db_type'], config['host'], config['port']
    type = config['db_type']
    """ creates a single instance of a user database  """
    if type == "elasticsearch":
        host = config['host']
        port = config['port']
        return ElasticSearchDbUsers(host, port, config)
    elif type == "sqlite":
        print(config)
        return SQLiteDbUsers(config['sqlite_file'])
    else:
        raise KeyError


class UserDatabase:
    db = None

class ExperimentDatabase:
    db = None

class TestDatabase:
    db = None

# sets up the user database with provided values in user_db_config.json
def setup_user_database():
    current_directory = os.path.dirname(__file__)
    parent_directory = os.path.split(current_directory)[0]
    file_path = os.path.join(parent_directory, 'databases', 'user_db_config.json')
    try:
        with open(file_path) as json_data_file:
            try:
                config_data = load(json_data_file)
                user_db = create_db_instance_for_users(config_data)
                UserDatabase.db = user_db
            except ValueError:
                error("> You need to specify the user database configuration in databases/user_db_config.json")
                exit(0)
            except KeyError:
                error("> You need to specify 'db_type', 'host', 'port' values in databases/user_db_config.json properly")
                exit(0)
    except:
        error("> You need to specify a 'user_db_config.json' file in the databases folder. You can copy the templates in that folder!")
        exit(0)

# sets up the actual experiment database / or test database with user-provided values (type, host, port)
# it uses mappings in the experiment_db_config.json
def setup_experiment_database(db_type, host, port, for_tests=False):
    current_directory = os.path.dirname(__file__)
    parent_directory = os.path.split(current_directory)[0]
    file_path = os.path.join(parent_directory, 'databases', 'experiment_db_config.json')
    try:
        with open(file_path) as json_data_file:
            try:
                config_data = load(json_data_file)
                if for_tests:
                    # change the index
                    config_data["index"]["name"] += str("_test")
                    TestDatabase.db = create_db_instance_for_experiments(db_type, host, port, config_data)
                else:
                    ExperimentDatabase.db = create_db_instance_for_experiments(db_type, host, port, config_data)
            except ValueError as ve:
                print(ve)
                error("> You need to specify the user database configuration in databases/experiment_db_config.json")
                exit(0)
            except KeyError:
                error("> You need to specify 'db_type', 'host', 'port' values in databases/experiment_db_config.json properly")
                exit(0)
            except ConnectionError as conn_err:
                raise conn_err
    except Exception as exc:
        error("> You need to specify a 'experiment_db_config.json' file in the databases folder. You can copy the template in that folder!")
        raise exc

def user_db():
    if not UserDatabase.db:
        error("You can setup the user database using experiment_db_config.json file")
        return None
    return UserDatabase.db


def db():
    if not ExperimentDatabase.db:
        return test_db()
    return ExperimentDatabase.db


def test_db():
    if not TestDatabase.db:
        error("You can configure experiment database for tests by calling for_tests=True flag in setup_experiment_database")
        return None
    return TestDatabase.db


def experiments_db():
    return ExperimentDatabase.db

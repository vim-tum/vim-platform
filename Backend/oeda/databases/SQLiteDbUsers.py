import traceback
from .UserDatabase import UserDatabase
from oeda.log import *
import sqlite3
import json

class SQLiteDbUsers(UserDatabase):
    
    def __init__(self, dbfile='OEDA.sqlite'):
        import os
        exists = os.path.isfile(dbfile)
        if not exists:
            warn('SQLite DB not found. Creating a new db')

        self.db = dbfile
        self.table = 'users'
        self.table_user_groups = 'user_groups'
        try:
            conn = sqlite3.connect(self.db)
            cursor = conn.cursor()
            print("Database connection successfull")
            try:
                sql_u_group = "CREATE TABLE IF NOT EXISTS " + self.table_user_groups + \
                    " (group_id integer PRIMARY KEY, group_name text NOT NULL UNIQUE, db_configuration TEXT, created_at DATETIME default current_timestamp)"
                cursor.execute(sql_u_group)
                sql = 'CREATE TABLE IF NOT EXISTS ' + self.table + \
                    '(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT, db_configuration TEXT, group_id integer NOT NULL, created_at DATETIME default current_timestamp, FOREIGN KEY(group_id) REFERENCES user_groups(group_id))'
                cursor.execute(sql)
                conn.commit()
                conn.close()
            
            except Exception as e:
                print(e)
                error('Table Creation Failed')
                conn.close()
        except:
            error("Database initialization failed")

        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                db_configuration = {}
                db_configuration['type'] = "elasticsearch"
                db_configuration['host'] = "localhost"
                db_configuration['port'] = 9200

                sql = 'insert into ' + self.table_user_groups + \
                    ' (group_name, db_configuration) VALUES(?,?)'
                cursor.execute(
                    sql, ["default", str(db_configuration)])

        except sqlite3.IntegrityError as e:
            print('Default user group exists')
        except Exception as e:
            print(e)
            error("Inserting default user group failed")
            return False

    def get_connection(self):
        conn = False
        try:
            conn = sqlite3.connect(self.db)
            conn.row_factory = sqlite3.Row
        except:
            error("Database connection failed")

        return conn


    def get_users(self):
        users = []
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'SELECT * FROM ' + self.table + ' as u INNER JOIN ' + self.table_user_groups + \
                    ' as ug ON u.group_id == ug.group_id'
                cursor.execute(sql)
                for row in cursor:
                    user = {}
                    user['name'] = row['name']
                    user['id'] = row['id']
                    user['password'] = row['password']
                    user['db_configuration'] = row['db_configuration']
                    user['created_at'] = row['created_at']
                    user['group_id'] = row['group_id']
                    user['group_name'] = row['group_name']

                # row = cursor.fetchone()
                    users.append(user)

                # for row in rows:
                #     users.append(row)
        except:
            error("Fetching all users failed")
            
        
        return users

    def get_user_groups(self):
        groups = []
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'SELECT * FROM ' + self.table_user_groups
                cursor.execute(sql)
                for row in cursor:
                    group = {}
                    group['db_configuration'] = row['db_configuration']
                    group['created_at'] = row['created_at']
                    group['group_id'] = row['group_id']
                    group['group_name'] = row['group_name']

                # row = cursor.fetchone()
                    groups.append(user)

                # for row in rows:
                #     users.append(row)
        except:
            error("Fetching all user groups failed")

        return groups


    def get_user(self, username):
        users = []
        try:
            conn = self.get_connection()
            with conn:
                
                cursor = conn.cursor()
                #sql = "SELECT * FROM " + self.table + " WHERE name = (?)"
                sql = 'SELECT * FROM ' + self.table + ' as u INNER JOIN ' + self.table_user_groups + \
                    ' as ug ON u.group_id == ug.group_id WHERE u.name = (?)'
                try:
                    cursor.execute(sql, (username,))
                    for row in cursor:
                        user = {}
                        print("row -> ")
                        print(row)
                        user['name'] = row['name']
                        user['id'] = row['id']
                        user['password'] = row['password']
                        user['db_configuration'] = row['db_configuration']

                        user['db_configuration'] = json.loads(
                            user['db_configuration'].replace("\'", "\""))
                        #user['created_at'] = row['created_at']
                        user['group_id'] = row['group_id']
                        user['group_name'] = row['group_name']


                    # row = cursor.fetchone()
                        users.append(user)
                    #print(users)
                except Exception as e:
                    print(e)
                
        except Exception as e:
            print(e)
            error("Fetching single user failed")
        
        return users if len(users) > 0 else None

    def save_user(self, user):
        
        if 'group_id' not in user:
            user['group_id'] = 1

        
        user['db_configuration'] = {}
        user['db_configuration']['type'] = "elasticsearch"
        user['db_configuration']['host'] = "localhost"
        user['db_configuration']['port'] = 9200

        print(user)
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'insert into ' + self.table + ' (name, password, group_id, db_configuration) VALUES(?,?,?,?)'
                cursor.execute(sql, [
                    user['name'],
                    user['password'],
                    user['group_id'],
                    str(user['db_configuration'])
                ])
            
        except Exception as e:
            print(e)
            error("Inserting user failed")
            return False
        
        return True

    def save_user_group(self, group):

        if 'group_name' not in group:
            error("Group name not provided.")
            return False
        else:
            group_name = group['group_name'].strip()
            if group_name == '':
                error("Group name cannot be empty")
                return False

        if 'db_configuration' not in group:
            group['db_configuration'] = ''
        else:
            group['db_configuration'] = str(group['db_configuration'])

        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'insert into ' + self.table_user_groups + \
                    ' (group_name, db_configuration) VALUES(?,?)'
                cursor.execute(
                    sql, [group_name, group['db_configuration']])

        except Exception as e:
            print(e)
            error("Inserting user group failed")
            return False

        return True

    def delete_user_group(self, group_name):

        if group_name == '':
            return True

        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'DELETE FROM ' + self.table_user_groups + ' WHERE group_name =?'
                cursor.execute(sql, [group_name.strip(), ])

        except Exception as e:
            print(e)
            error("Deleting user group failed")
            return False

        return True

    def delete_user(self, username):

        if not username:
            return True

        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'DELETE FROM ' + self.table_user + ' WHERE name =?'
                cursor.execute(sql, [username.strip(), ])

        except Exception as e:
            print(e)
            error("Deleting user failed")
            return False

        return True


    def update_user(self, user):
        try:
            conn = sqlite3.connect(self.db)
            with conn:
                cursor = conn.cursor()
                users = self.get_user(user['name'])
                if len(users) == 1:
                    sql = 'update ' + self.table + ' set name = (?) where name = (?)'
                    cursor.execute(sql, (users[0]['name'], users[0]['name'], ))
                else:
                    return False
            
        except:
            error("Updating user failed")
            return False
        
        return True

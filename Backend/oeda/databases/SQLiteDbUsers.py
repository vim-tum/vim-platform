import traceback

from werkzeug.security import generate_password_hash

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
        self.table_roles = 'roles'
        self.table_permissions = 'permissions'
        self.table_users_roles = 'users_roles'
        self.table_roles_permissions = 'roles_permissions'
        self.table_password_reset_tokens = 'password_reset_tokens'

        self.create_tables()

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

    def setup_default_rbac(self, rbac):
        print("Setup default configuration for user access")
        for permission in rbac["permissions"]:
            self.save_permission(permission)
        for role in rbac["roles"]:
            for permission in role["permissions"]:
                permission_name = permission["name"]
                permission_id = next(
                    filter(lambda permission: permission["name"] == permission_name, rbac["permissions"]))[
                    "id"]
                permission["id"] = permission_id

            self.create_role(role)
        for user in rbac["users"]:
            user["password"] = generate_password_hash(user['password'])
            for role in user["roles"]:
                role_name = role["name"]
                role_id = next(
                    filter(lambda role: role["name"] == role_name, rbac["roles"]))["id"]
                role["role_id"] = role_id
            self.save_user(user)

    def drop_rbac_tables(self):
        conn = self.get_connection()
        with conn:
            cursor = conn.cursor()
            self.drop_table(cursor, self.table_user_groups)
            self.drop_table(cursor, self.table_roles)
            self.drop_table(cursor, self.table_permissions)
            self.drop_table(cursor, self.table_users_roles)
            self.drop_table(cursor, self.table_roles_permissions)
            self.drop_table(cursor, self.table)

    def create_tables(self):
        try:
            conn = sqlite3.connect(self.db)
            cursor = conn.cursor()
            print("Database connection successfull")
            try:
                sql_u_group = "CREATE TABLE IF NOT EXISTS " + self.table_user_groups + \
                              " (group_id integer PRIMARY KEY, group_name text NOT NULL UNIQUE, db_configuration TEXT, created_at DATETIME default current_timestamp)"
                cursor.execute(sql_u_group)
                sql_user = 'CREATE TABLE IF NOT EXISTS ' + self.table + \
                           '(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT, email TEXT, db_configuration TEXT, group_id integer NOT NULL, created_at DATETIME default current_timestamp, FOREIGN KEY(group_id) REFERENCES user_groups(group_id))'
                cursor.execute(sql_user)
                sql_role = 'CREATE TABLE IF NOT EXISTS ' + self.table_roles + '(' \
                                                                              'role_id INTEGER PRIMARY KEY AUTOINCREMENT,' + \
                           'name TEXT,' + \
                           'description TEXT, ' \
                           'basic INTEGER)'
                cursor.execute(sql_role)
                sql_permissions = 'CREATE TABLE IF NOT EXISTS ' + self.table_permissions + '(' \
                                                                                           'permission_id INTEGER PRIMARY KEY AUTOINCREMENT,' + \
                                  'name TEXT)'
                cursor.execute(sql_permissions)

                sql_users_roles = 'CREATE TABLE IF NOT EXISTS ' + self.table_users_roles + '(' \
                                                                                           'user_id INTEGER REFERENCES ' + self.table + '(id) ON DELETE CASCADE ON UPDATE CASCADE,' + \
                                  'role_id INTEGER REFERENCES ' + self.table_roles + '(role_id) ON DELETE CASCADE ON UPDATE CASCADE, UNIQUE(user_id, role_id));'

                cursor.execute(sql_users_roles)
                sql_roles_permissions = 'CREATE TABLE IF NOT EXISTS ' + self.table_roles_permissions + '(' \
                                                                                                       'role_id INTEGER REFERENCES ' + self.table_roles + '(id) ON DELETE CASCADE ON UPDATE CASCADE,' + \
                                        'permission_id INTEGER REFERENCES ' + self.table_permissions + '(role_id) ON DELETE CASCADE ON UPDATE CASCADE,' + \
                                        'access_all INTEGER NOT NULL, UNIQUE(role_id, permission_id))'
                cursor.execute(sql_roles_permissions)

                sql_password_reset = 'CREATE TABLE IF NOT EXISTS ' + self.table_password_reset_tokens + ' (' \
                                                                                                        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' \
                                                                                                        'token TEXT, ' \
                                                                                                        'user_id REFERENCES ' + self.table + '(id) ON DELETE CASCADE ON UPDATE CASCADE, ' \
                                                                                                                                             'expiry_date TIMESTAMP, UNIQUE(user_id));'
                cursor.execute(sql_password_reset)

                conn.commit()
                conn.close()

            except Exception as e:
                print(e)
                error('Table Creation Failed')
                conn.close()
        except:
            error("Database initialization failed")

    def drop_table(self, cursor, table_name):
        try:
            drop = 'DROP TABLE IF EXISTS ' + table_name
            cursor.execute(drop)
        except Exception as e:
            print(e)
            error("Droping table " + table_name + " failed")

    def get_connection(self):
        conn = False
        try:
            conn = sqlite3.connect(self.db)
            conn.row_factory = sqlite3.Row
        except:
            error("Database connection failed")

        return conn

    def get_users(self):
        users = {}
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'SELECT u.*, ug.*, r.role_id, r.name as role_name, r.description as role_description ' \
                      'FROM ' + self.table + ' as u ' \
                                             'INNER JOIN ' + self.table_user_groups + ' ug on ug.group_id = u.group_id ' \
                                                                                      'LEFT OUTER JOIN ' + self.table_users_roles + ' ur on u.id = ur.user_id ' \
                                                                                                                                    'LEFT OUTER JOIN ' + self.table_roles + ' r on r.role_id = ur.role_id; '

                cursor.execute(sql)
                for row in cursor:
                    username = row['name']
                    if username not in users:
                        user = {}
                        user['name'] = row['name']
                        user['id'] = row['id']
                        # user['password'] = row['password']
                        user['email'] = row['email']
                        user['db_configuration'] = row['db_configuration']
                        user['created_at'] = row['created_at']
                        user['group_id'] = row['group_id']
                        user['group_name'] = row['group_name']
                        user['roles'] = []
                        users[username] = user

                    if row['role_id'] is not None:
                        role = {'role_id': row['role_id'], 'name': row['role_name'],
                                'description': row['role_description']}
                        users[username]['roles'].append(role)

                    # row = cursor.fetchone()
                    # users.append(user)

                # for row in rows:
                #     users.append(row)
        except Exception as e:
            print(e)
            error("Fetching all users failed")

        return list(users.values())

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

    def get_permissions(self, username):
        permissions = []
        try:
            conn = self.get_connection()
            with conn:
                sql = 'SELECT DISTINCT p.permission_id, p.name, rp.access_all FROM users as u ' + \
                      'INNER JOIN users_roles as ur ON u.id == ur.user_id ' + \
                      'INNER JOIN roles as r ON ur.role_id == r.role_id ' + \
                      'INNER JOIN roles_permissions rp on r.role_id = rp.role_id ' + \
                      'INNER JOIN permissions p on p.permission_id = rp.permission_id ' + \
                      'WHERE u.name = (?)'
                cursor = conn.cursor()
                cursor.execute(sql, (username,))
                for row in cursor:
                    permissions.append(
                        {"id": row['permission_id'], "name": row['name'], "access_all": row['access_all'] == 1})
        except Exception as e:
            print(e)
            error("Fetching permission failed")
        return permissions

    def get_user(self, username):
        users = []
        try:
            conn = self.get_connection()
            with conn:

                cursor = conn.cursor()
                # sql = "SELECT * FROM " + self.table + " WHERE name = (?)"
                sql = 'SELECT u.*, ug.*, r.role_id, r.name as role_name, r.description as role_description FROM ' \
                      + self.table + ' as u INNER JOIN ' + self.table_user_groups + \
                      ' as ug ON u.group_id == ug.group_id ' \
                      'LEFT OUTER JOIN ' + self.table_users_roles + ' as ur ON u.id = ur.user_id ' \
                      'LEFT OUTER JOIN ' + self.table_roles + ' as r ON ur.role_id = r.role_id ' \
                      'WHERE u.name = (?)'
                try:
                    cursor.execute(sql, (username,))
                    user = {'roles': [] }
                    found = False
                    for row in cursor:
                        found = True
                        print("row -> ")
                        print(row)
                        user['name'] = row['name']
                        user['id'] = row['id']
                        user['password'] = row['password']
                        user['email'] = row['email']
                        user['db_configuration'] = row['db_configuration']

                        user['db_configuration'] = json.loads(
                        user['db_configuration'].replace("\'", "\""))
                        # user['created_at'] = row['created_at']
                        user['group_id'] = row['group_id']
                        user['group_name'] = row['group_name']
                        if row['role_id']:
                            user['roles'].append({'id': row['role_id'], 'name': row['role_name'],
                                              'description': row['role_description']})

                        # row = cursor.fetchone()
                    if found:
                        users.append(user)
                    # print(users)
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

        # print(user)
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'insert into ' + self.table + ' (name, password, email, group_id, db_configuration) VALUES(?,?,?,?,?)'
                cursor.execute(sql, [
                    user['name'],
                    user['password'],
                    user['email'],
                    user['group_id'],
                    str(user['db_configuration'])
                ])
                user["id"] = cursor.lastrowid
                self.update_user_role(user["id"], user['roles'], cursor)

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

                sql = 'DELETE FROM ' + self.table + ' WHERE name = ?'
                cursor.execute(sql, [username, ])

        except Exception as e:
            print(e)
            error("Deleting user failed")
            return False

        return True


    def update_user(self, user):

        update_user_profile_sql = "UPDATE " + self.table + " SET name = ?, email = ? WHERE id = ?;"
        try:
            conn = sqlite3.connect(self.db)
            with conn:
                cursor = conn.cursor()
                cursor.execute(update_user_profile_sql, [user['name'], user['email'], user['id']])
                self.update_user_role(user['id'], user['roles'], cursor)
        except Exception as e:
            print(e)
            error("Updating user role failed")

    def update_user_role(self, user_id, roles, cursor):
        insert_user_role = 'INSERT OR IGNORE INTO ' + self.table_users_roles + ' (user_id, role_id) VALUES(?,?);'
        delete_user_role = 'DELETE FROM ' + self.table_users_roles + ' WHERE user_id = ? and role_id = ?;'
        for role in roles:
            if role['isActive']:
                cursor.execute(insert_user_role, [user_id, role['role_id']])
            else:
                cursor.execute(delete_user_role, [user_id, role['role_id']])

    def get_all_roles(self):
        roles = []
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()
                sql = 'SELECT * FROM ' + self.table_roles
                cursor.execute(sql)
                for row in cursor:
                    role = {}
                    role['name'] = row['name']
                    role['id'] = row['id']
                    role['description'] = row['description']
                    roles.append(role)
        except:
            error("Fetching all roles failed")

    def get_all_permissions(self):
        permissions = []
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()
                sql = 'SELECT * FROM ' + self.table_permissions
                cursor.execute(sql)
                for row in cursor:
                    permission = {}
                    permission['name'] = row['name']
                    permission['id'] = row['permission_id']
                    permission['access_all'] = False
                    permissions.append(permission)
        except Exception as e:
            print(e)
            error("Fetching all permissions failed")

        return permissions

    def save_permission(self, permission):
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()

                sql = 'insert into ' + self.table_permissions + ' (name) VALUES(?)'
                cursor.execute(sql, [permission['name']])
                permission["id"] = cursor.lastrowid
                return True
        except Exception as e:
            print(e)
            error("Inserting permissions failed")
            return False

    def get_roles(self):
        roles = {}
        try:
            conn = self.get_connection()
            with conn:
                cursor = conn.cursor()
                sql = 'SELECT r.*, p.permission_id, p.name as permission_name, rp.access_all FROM ' + self.table_roles + ' r ' + \
                      'LEFT OUTER JOIN ' + self.table_roles_permissions + ' rp ON r.role_id = rp.role_id ' + \
                      'LEFT OUTER JOIN ' + self.table_permissions + ' p ON p.permission_id = rp.permission_id;'

                cursor.execute(sql)
                for row in cursor:
                    role_name = row['name']
                    if role_name not in roles:
                        role = {}
                        role['name'] = role_name
                        role['description'] = row['description']
                        role['role_id'] = row['role_id']
                        role['basic'] = row['basic'] == 1
                        role['permission'] = []
                        roles[role_name] = role

                    if row['permission_id'] is not None:
                        permission = {'id': row['permission_id'], 'name': row['permission_name'],
                                      'access_all': row['access_all'] == 1}
                        roles[role_name]['permission'].append(permission)
        except Exception as e:
            print(e)
            error("Fetching all roles failed")
        return list(roles.values())

    def create_role(self, role):
        conn = self.get_connection()
        create_role_sql = "INSERT INTO " + self.table_roles + " (name,description,basic) VALUES (?,?,?);"
        with conn:
            cur = conn.cursor()
            cur.execute(create_role_sql, [role['name'], role['description'], 1 if role['basic'] else 0])
            role['id'] = cur.lastrowid
            self.update_role_intern(role, cur)

    def update_role(self, role):
        conn = self.get_connection()
        with conn:
            cur = conn.cursor()
            self.update_role_intern(role, cur)

    def update_role_intern(self, role, cur):
        role_update_sql = "UPDATE " + self.table_roles + " SET description = ? WHERE role_id = ?;"

        permission_insert_sql = "INSERT OR IGNORE INTO " \
                                + self.table_roles_permissions + \
                                " VALUES (?,?,?);"
        where_sql = " role_id = ? and permission_id = ?"
        permission_update_sql = "UPDATE " + self.table_roles_permissions + " SET access_all = ? WHERE" + where_sql + ";"
        permission_delete_sql = "DELETE FROM " + self.table_roles_permissions + " WHERE " + where_sql + ";"

        cur.execute(role_update_sql, [role['description'], role['id']])
        for permission in role['permissions']:
            if permission['is_active']:
                access_all = 1 if permission['access_all'] else 0
                cur.execute(permission_insert_sql, [role['id'], permission['id'], access_all])
                cur.execute(permission_update_sql, [access_all, role['id'], permission['id']])
            else:
                cur.execute(permission_delete_sql, [role['id'], permission['id']])

    def delete_role(self, role):
        role_delete_sql = "DELETE FROM " + self.table_roles + " WHERE role_id = ? and basic = 0;"
        conn = self.get_connection()
        with conn:
            conn.execute(role_delete_sql, [role['id']])

    def update_user_profile(self, username, user):
        update_profile_sql = "UPDATE " + self.table + " SET email = ? WHERE name = ? "
        conn = self.get_connection()
        with conn:
            conn.execute(update_profile_sql, [user['email'], username])

    def update_user_password(self, user_id, password):
        update_password_sql = "UPDATE " + self.table + " SET password = ? WHERE id = ? "
        conn = self.get_connection()
        with conn:
            conn.execute(update_password_sql, [password, user_id])

    def get_password_reset_token(self, token_hash):
        select_reset_token = "SELECT * FROM " + self.table_password_reset_tokens \
                             + " WHERE token = ?;"
        conn = sqlite3.connect(self.db, detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row
        with conn:
            cursor = conn.cursor()
            cursor.execute(select_reset_token, [token_hash])
            result = cursor.fetchone()
            return {"id": result["id"], "token": result["token"], "user_id": result["user_id"],
                    "expiry_date": result["expiry_date"]} if result is not None else None

    def create_password_reset_token(self, user_id, token_hash, expiry_date):
        insert_reset_token_sql = "INSERT OR REPLACE INTO " + self.table_password_reset_tokens \
                                 + " (token, user_id, expiry_date) VALUES (?,?,?);"

        conn = self.get_connection()
        with conn:
            conn.execute(insert_reset_token_sql, [token_hash, user_id, expiry_date])

    def delete_password_reset_token(self, token_id):
        delete_reset_token_sql = "DELETE FROM " + self.table_password_reset_tokens \
                                 + " WHERE id = ?;"
        conn = self.get_connection()
        with conn:
            conn.execute(delete_reset_token_sql, [token_id])

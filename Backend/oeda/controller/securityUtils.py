import inspect
from datetime import timedelta

from flask_jwt_extended import get_jwt_identity, jwt_required, create_access_token, create_refresh_token, get_jwt, \
    verify_jwt_in_request
from flask_jwt_extended.internal_utils import get_jwt_manager

from oeda.databases import user_db, db


class Permission:
    GET_EXPERIMENT = 'GET_EXPERIMENT'
    WRITE_EXPERIMENT = 'WRITE_EXPERIMENT'
    DEL_EXPERIMENT = 'DEL_EXPERIMENT'

    GET_TARGETSYSTEM = 'GET_TARGETSYSTEM'
    WRITE_TARGETSYSTEM = 'WRITE_TARGETSYSTEM'
    DEL_TARGETSYSTEM = 'DEL_TARGETSYSTEM'

    WRITE_DATASTORAGE = 'WRITE_DATASTORAGE'


class Role:
    ADMIN = "Admin_Role"


not_authorized = {"message": "You have not enough permissions!"}, 403


def require_permission(required_permission, has_access_to_resource=lambda *args, **kwargs: True):
    def decorator(func):
        def wrapper(*args, **kwargs):

            # get users permissions
            current_user = get_jwt_auth_identity()
            permissions = user_db().get_permissions(current_user)
            permission = next(
                filter(lambda permission_: permission_["name"] == required_permission, permissions), None)
            delegate_kwargs = {}
            for key in inspect.getfullargspec(has_access_to_resource).args:
                value = kwargs.get(key, None)
                delegate_kwargs[key] = value
            # check if has required permission
            if permission is not None and (
                    permission["access_all"] or has_access_to_resource(*args, **delegate_kwargs)):
                # if function takes argument permission, add it
                if 'permission' in inspect.getfullargspec(func).args:
                    kwargs['permission'] = permission
                return func(*args, **kwargs)
            else:
                return not_authorized

        return wrapper

    return decorator


def user_has_role(user, role):
    return next(
        filter(lambda role_: role_["name"] == role, user['roles']), None)


def require_role(required_role):
    def decorator(func):
        def wrapper(*args, **kwargs):
            current_user = get_jwt_auth_identity()
            users = user_db().get_user(current_user)
            if users and user_has_role(users[0], required_role):
                return func(*args, **kwargs)
            else:
                return not_authorized

        return wrapper

    return decorator


def identity_is_username():
    def decorator(func):
        def wrapper(username):
            current_user = get_jwt_auth_identity()
            if current_user == username:
                return func(username)
            else:
                return not_authorized

        return wrapper

    return decorator


def has_access_to_experiment(experiment_id):
    experiment = db().get_experiment(experiment_id)
    user = get_jwt_auth_identity()
    return experiment["user"] == user


def has_access_to_target(target_id):
    target = db().get_target(target_id)
    user = get_jwt_auth_identity()
    return target["user"] == user


def has_access_to_user(username):
    user = get_jwt_auth_identity()
    return username == user


def jwt_auth_required():
    def wrapper(fn):
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if not ('file_access_token' in claims and claims['file_access_token']):
                return fn(*args, **kwargs)
            else:
                return {"message": "Only access token allowed"}, 401

        return decorator

    return wrapper


def file_access_token_required():
    def wrapper(fn):
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if 'file_access_token' in claims and claims['file_access_token']:
                return fn(*args, **kwargs)
            else:
                return not_authorized

        return decorator

    return wrapper


def get_jwt_auth_identity():
    return get_jwt_identity()


def get_jwt_auth_claims():
    return get_jwt()


def refresh_token_required():
    return jwt_required(refresh=True)


def create_jwt_auth_access_token(identity, additional_claims):
    additional_claims['user'].pop('password', None)
    additional_claims['user'].pop("roles", None)
    additional_claims['user'].pop("email", None)
    return create_access_token(identity=identity, additional_claims=additional_claims)


def create_jwt_auth_refresh_token(identity):
    return create_refresh_token(identity=identity)


def create_jwt_auth_file_access_token(identity, experiment_id, filename):
    return create_access_token(identity=identity, expires_delta=timedelta(minutes=3),
                               additional_claims={'file_access_token': True, 'filename': filename,
                                                  'experiment_id': experiment_id})

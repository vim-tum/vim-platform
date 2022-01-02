from flask import request, jsonify
from flask_jwt_extended import jwt_required
from flask_restful import Resource

from oeda.controller.securityUtils import require_permission, Permission, has_access_to_target, get_jwt_auth_identity, \
    not_authorized
from oeda.databases import db
import traceback

class TargetController(Resource):

    @staticmethod
    @jwt_required()
    @require_permission(Permission.GET_TARGETSYSTEM, has_access_to_target)
    def get(target_id):
        target = db().get_target(target_id)
        try:
            return target
        except:
            return {"error": "not found"}, 404

    @staticmethod
    @jwt_required()
    @require_permission(Permission.WRITE_TARGETSYSTEM)
    def post(target_id, permission):
        try:
            target_system = request.get_json()

            user = get_jwt_auth_identity()
            if not permission["access_all"] and not target_system["user"] == user:
               return not_authorized

            # check if given name is unique
            ids, targets = db().get_targets()

            for target in targets:
                if target['name'] == target_system['name']:
                    return {"message": "Duplicate target system names"}, 409

            target_system["status"] = "READY"
            db().save_target(target_system)
            resp = jsonify(target_system)
            resp.status_code = 200
            return resp
        except Exception as e:
            print(e)
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404

    @staticmethod
    @jwt_required()
    @require_permission(Permission.WRITE_TARGETSYSTEM, has_access_to_target)
    def put(target_id):
        try:
            if target_id is None:
                return {"message": "target_id should not be null"}, 404
            content = request.get_json()
            status = content["status"]
            db().update_target_system(target_system_id=target_id, field="status", value=status)
            resp = jsonify({"message": "Target system status is updated"})
            resp.status_code = 200
            return resp
        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"message": e.message}, 404


class TargetsListController(Resource):

    @staticmethod
    @jwt_required()
    @require_permission(Permission.GET_TARGETSYSTEM)
    def get(permission):
        ids, targets = db().get_targets()
        new_targets = targets
        i = 0
        for _ in targets:
            new_targets[i]["id"] = ids[i]
            i += 1
        new_targets = sorted(new_targets, key=lambda x: x["name"])

        if not permission["access_all"]:
            current_user = get_jwt_auth_identity()
            new_targets = list(filter(lambda target: target["user"] == current_user, new_targets))

        return new_targets

class TargetDeleteController(Resource):

    @staticmethod
    @jwt_required()
    @require_permission(Permission.DEL_TARGETSYSTEM, has_access_to_target)
    def get(target_id):
        target = db().delete_target(target_id)
        try:
            return target
        except:
            return {"error": "not found"}, 404
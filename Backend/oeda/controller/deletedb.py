from oeda.databases import user_db, setup_experiment_database, db
from flask_restful import Resource
import traceback


class DeleteDBController(Resource):
    @staticmethod
    def get():
        try:
            if db() is not None:
                db().clear_db()
                return {"message": "Database is cleared successfully"}, 200

        except Exception as e:
            tb = traceback.format_exc()
            print(tb)
            return {"error": e.message}, 404

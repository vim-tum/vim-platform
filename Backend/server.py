#!flask/bin/python
import logging
from flask import Flask
from flask_restful import Api

from oeda.controller.targets import TargetController, TargetsListController, TargetDeleteController
from oeda.controller.configuration import ConfigController, MlrMBOConfigController
from oeda.controller.experiments import ExperimentsListController, ExperimentController, ExperimentDeleteController
from oeda.controller.experiment_results import StageResultsWithExperimentIdController, AllStageResultsWithExperimentIdController
from oeda.controller.running_experiment_results import RunningAllStageResultsWithExperimentIdController, OEDACallbackController
from oeda.controller.stages import StageController
from oeda.controller.plotting import QQPlotController, BoxPlotController
from oeda.controller.users import UserRegisterController, UserListController, UserController, UserLoginController, UserGroupController, UserGroupListController, UserGroupRegisterController
from oeda.controller.execution_scheduler import ExecutionSchedulerController
from oeda.controller.deletedb import DeleteDBController
from oeda.controller.analysis import AnalysisController

app = Flask(__name__, static_folder="assets")

# Define Frontend Hosting
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return app.send_static_file('index.html')


@app.route('/control.module.chunk.js')
def control():
    return app.send_static_file('control.module.chunk.js')


@app.route('/landingpage.module.chunk.js')
def landingpage():
    return app.send_static_file('landingpage.module.chunk.js')


@app.route('/inline.module.chunk.js')
def inlinechunk():
    return app.send_static_file('inline.module.chunk.js')


@app.route('/polyfills.bundle.js')
def polyfills():
    return app.send_static_file('polyfills.bundle.js')


@app.route('/vendor.bundle.js')
def vendor():
    return app.send_static_file('vendor.bundle.js')


@app.route('/inline.bundle.js')
def inline():
    return app.send_static_file('inline.bundle.js')


@app.route('/main.bundle.js')
def main():
    return app.send_static_file('main.bundle.js')


@app.route('/styles.bundle.css')
def styles():
    return app.send_static_file('styles.bundle.css')


@app.route('/styles.bundle.js')
def stylesJS():
    return app.send_static_file('styles.bundle.js')

# Defining API Part
api = Api(app)
api.add_resource(UserLoginController, '/api/auth/login')
api.add_resource(UserRegisterController, '/api/auth/register')

api.add_resource(UserListController, '/api/users')
api.add_resource(UserController, '/api/user/<string:username>')

# newly added group functionalities by rakib
api.add_resource(UserGroupListController, '/api/usergroups')
api.add_resource(UserGroupRegisterController, '/api/usergroup/register')
api.add_resource(UserGroupController, '/api/usergroup/<string:group_name>')


api.add_resource(ExperimentsListController, '/api/experiments')
api.add_resource(ExperimentController, '/api/experiments/<string:experiment_id>')
api.add_resource(ExperimentDeleteController, '/api/experiments/delete/<string:experiment_id>')
api.add_resource(AnalysisController, '/api/analysis/<string:experiment_id>/<string:step_no>/<string:analysis_name>')

api.add_resource(TargetsListController, '/api/targets')
api.add_resource(TargetController, '/api/targets/<string:target_id>')
api.add_resource(TargetDeleteController, '/api/targets/delete/<string:target_id>')

api.add_resource(StageResultsWithExperimentIdController, '/api/experiment_results/<string:experiment_id>/<string:step_no>/<string:stage_no>') # Is this used?
api.add_resource(AllStageResultsWithExperimentIdController, '/api/experiment_results/<string:experiment_id>')
api.add_resource(StageController, '/api/steps/<string:experiment_id>')
api.add_resource(RunningAllStageResultsWithExperimentIdController, '/api/running_experiment_results/<string:experiment_id>/<string:timestamp>')

api.add_resource(QQPlotController, '/api/qqPlot/<string:experiment_id>/<string:step_no>/<string:stage_no>/<string:distribution>/<string:scale>/<string:incoming_data_type_name>')
api.add_resource(BoxPlotController, '/api/boxPlot/<string:experiment_id>/<string:step_no>/<string:stage_no>/<string:scale>/<string:incoming_data_type_name>')
api.add_resource(OEDACallbackController, '/api/running_experiment_results/oeda_callback/<string:experiment_id>')

api.add_resource(ConfigController, '/api/config')
api.add_resource(MlrMBOConfigController, '/api/config/mlrMBO')

api.add_resource(ExecutionSchedulerController, '/api/execution_scheduler')

# TODO: following is for easy deletion of db tuples, remove upon production
api.add_resource(DeleteDBController, '/api/delete')

if __name__ == '__main__':
    from tornado.wsgi import WSGIContainer
    from tornado.httpserver import HTTPServer
    from tornado.ioloop import IOLoop
    from tornado.log import enable_pretty_logging
    from flask_cors import CORS
    from oeda.databases import setup_user_database

    # This hack is NOT NEEDED anymore in Python 3:
    # import sys
    # importlib.reload(sys)  # Reload does the trick! #see:https://github.com/flask-restful/flask-restful/issues/552
    # sys.setdefaultencoding('UTF8')

    app.logger.setLevel(logging.WARNING)
    cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
    http_server = HTTPServer(WSGIContainer(app))
    http_server.listen(5000)
    enable_pretty_logging()
    setup_user_database()

    # this is just for easy debugging, o/w user needs to logout & login to the system every time server gets restarted
    # from oeda.databases import setup_experiment_database
    # setup_experiment_database("elasticsearch", "localhost", "9200")

    from oeda.service.execution_scheduler import initialize_execution_scheduler
    initialize_execution_scheduler(10)
    IOLoop.instance().start()

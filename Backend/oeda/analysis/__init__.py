from abc import ABCMeta, abstractmethod
from oeda.log import *

class Analysis(object):

    __metaclass__ = ABCMeta

    def __init__(self, stage_ids, y_key):
        self.stage_ids = stage_ids
        self.y_key = y_key
        self.stages_count = len(stage_ids)

    def start(self, data, knobs):
        if not data:
            error("Tried to run " + self.name + " on empty data.")
            error("Aborting analysis.")
            return

        return self.run(data, knobs)

    @abstractmethod
    def run(self, data, knobs):
        """ analysis-specific logic """
        pass
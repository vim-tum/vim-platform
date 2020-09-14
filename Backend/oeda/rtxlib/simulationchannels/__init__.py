from oeda.log import *
from oeda.rtxlib.changeproviders.DummyChangeProvider import DummyChangeChangeProvider
from oeda.rtxlib.changeproviders.HTTPRequestChangeProvider import HTTPRequestChangeProvider
from oeda.rtxlib.changeproviders.KafkaProducerChangeProvider import KafkaProducerChangeProvider
from oeda.rtxlib.changeproviders.MQTTPublisherChangeProvider import MQTTPublisherChangeProvider


def init_channels(wf):
    debug("initiazling channels", Fore.LIGHTMAGENTA_EX)
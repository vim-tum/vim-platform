from oeda.log import *
import traceback

def _defaultChangeProvider(variables,wf):
    """ by default we just forward the message to the change provider """
    return variables

def experimentFunction(wf, exp):

    if hasattr(wf, "experimentCounter"):
        wf.remaining_time_and_stages['remaining_stages'] = wf.totalExperiments - wf.experimentCounter

    """ executes a given experiment stage """
    start_time = current_milli_time()
    # remove all old data from the queues
    wf.primary_data_provider["instance"][0].reset()

    # load change event creator or use a default
    if hasattr(wf, "change_event_creator"):
        change_creator = wf.change_event_creator
    else:
        change_creator = _defaultChangeProvider

    # start
    info(">")
    info("> KnobValues     | " + str(exp["knobs"]))

    try:
        wf.change_provider["instance"].applyChange(change_creator(exp["knobs"], wf))
    except:
        error("apply changes did not work")

    # ignore the first data sets
    to_ignore = exp["ignore_first_n_samples"]
    if to_ignore > 0:
        i = 0
        while i < to_ignore:
            new_data = wf.primary_data_provider["instance"][0].returnData()
            if new_data is not None:
                i += 1
                # we callback to oeda and give us info there
                wf.run_oeda_callback({"experiment": exp,
                                      "status": "IGNORING_SAMPLES",
                                      "index": i,
                                      "size": to_ignore,
                                      str("current_knob"): dict(exp["knobs"]),
                                      "remaining_time_and_stages": wf.remaining_time_and_stages})
                process("IgnoreSamples  | ", i, to_ignore)
                # NEW - we check for any interruption flags
                if wf._oeda_stop_request.isSet():
                    raise RuntimeError("Experiment interrupted from OEDA while ignoring data.")

    # start collecting data
    sample_size = exp["sample_size"]
    i = 0
    try:
        while i < sample_size:
            # we start with the primary data provider using blocking returnData
            new_data = wf.primary_data_provider["instance"][0].returnData()
            if new_data is not None:
                try:
                    wf = wf.primary_data_provider["data_reducer"](new_data, wf)
                    # NEW - we call back to oeda and give us infos there
                    wf.run_oeda_callback({"experiment": exp,
                                          "status": "COLLECTING_DATA",
                                          "index": i, "size": sample_size,
                                          str("current_knob"): dict(exp["knobs"]),
                                          "remaining_time_and_stages": wf.remaining_time_and_stages})
                except StopIteration as e:
                    raise  # just fwd
                except RuntimeError as e:
                    raise  # just fwd
                except Exception as e:
                    tb = traceback.format_exc()
                    error("Exception:", str(tb))
                    error("Could not reduce data set: " + str(new_data))
                i += 1
                process("CollectSamples | ", i, sample_size)

            # now we use returnDataListNonBlocking on all secondary data providers
            # if hasattr(wf, "secondary_data_providers"):
            #     for cp in wf.secondary_data_providers:
            #         if cp["type"] == "kafka_consumer" and 'consider_aggregate_topic' in cp:
            #             new_data = cp["instance"].returnDataListNonBlocking()
            #             idx = wf.secondary_data_providers.index(cp)
            #             # just get the name of the variable from (cp) and pass it to (nd, wf, idx)
            #             for nd in new_data:
            #                 try:
            #                     wf = cp["data_reducer"](nd, wf, idx)
            #                 except StopIteration as e:
            #                     raise  # just
            #                 except RuntimeError as e:
            #                     raise  # just fwd
            #                 except Exception as e:
            #                     tb = traceback.format_exc()
            #                     error("Exception:", str(tb))
            #                     error("Could not reduce data set: " + str(nd))
    except StopIteration as e:
        # this iteration should stop asap
        error("This stage got stopped as requested by the StopIteration exception:" + str(e))
    try:
        result = wf.evaluator(wf)
    except Exception as e:
        result = 0
        error("Exception in workflow evaluator", str(e))
        tb = traceback.format_exc()
        error("Evaluator failed", str(tb))
    # we store the counter of this experiment in the workflow
    if hasattr(wf, "experimentCounter"):
        wf.experimentCounter += 1
    else:
        wf.experimentCounter = 1

    duration = current_milli_time() - start_time
    wf.remaining_time_and_stages['remaining_stages'] = wf.totalExperiments - wf.experimentCounter
    wf.remaining_time_and_stages['remaining_time'] = str(wf.remaining_time_and_stages['remaining_stages'] * duration / 1000)

    # do not show stats for forever strategy
    if wf.totalExperiments > 0:
        info("> Statistics     | " + str(wf.experimentCounter) + "/" + str(wf.totalExperiments)
             + " took " + str(duration) + "ms" + " - remaining ~" + wf.remaining_time_and_stages['remaining_time'] + "sec")
    # info("> FullState      | " + str(exp["state"]))
    info("> ResultValue    | " + str(result))
    # log the result values into a csv file
    # @todo disabled (!) log_results(wf.folder, exp["knobs"].values() + [result])
    # return the result value of the evaluator
    return result


def simulationFunction(wf, exp):

    if hasattr(wf, "experimentCounter"):
        wf.remaining_time_and_stages['remaining_stages'] = wf.totalExperiments - wf.experimentCounter

    """ executes a given experiment stage """
    start_time = current_milli_time()
    # remove all old data from the queues
    wf.primary_data_provider["instance"][0].reset()

    # load change event creator or use a default
    if hasattr(wf, "change_event_creator"):
        change_creator = wf.change_event_creator
    else:
        change_creator = _defaultChangeProvider

    # start
    info(">")
    info("> KnobValues     | " + str(exp["knobs"]))

    try:
        wf.change_provider["instance"].applyChange(change_creator(exp["knobs"], wf))
    except:
        error("apply changes did not work")

    # ignore the first data sets
    to_ignore = exp["ignore_first_n_samples"]
    if to_ignore > 0:
        i = 0
        while i < to_ignore:
            new_data = wf.primary_data_provider["instance"][0].returnData()
            if new_data is not None:
                i += 1
                # we callback to oeda and give us info there
                wf.run_oeda_callback({"experiment": exp,
                                      "status": "IGNORING_SAMPLES",
                                      "index": i,
                                      "size": to_ignore,
                                      str("current_knob"): dict(exp["knobs"]),
                                      "remaining_time_and_stages": wf.remaining_time_and_stages})
                process("IgnoreSamples  | ", i, to_ignore)
                # NEW - we check for any interruption flags
                if wf._oeda_stop_request.isSet():
                    raise RuntimeError("Experiment interrupted from OEDA while ignoring data.")

    # start collecting data
    sample_size = exp["sample_size"]
    i = 0
    try:
        while i < sample_size:
            # we start with the primary data provider using blocking returnData
            new_data = wf.primary_data_provider["instance"][0].returnData()
            if new_data is not None:
                try:
                    wf = wf.primary_data_provider["data_reducer"](new_data, wf)
                    # NEW - we call back to oeda and give us infos there
                    wf.run_oeda_callback({"experiment": exp,
                                          "status": "COLLECTING_DATA",
                                          "index": i, "size": sample_size,
                                          str("current_knob"): dict(exp["knobs"]),
                                          "remaining_time_and_stages": wf.remaining_time_and_stages})
                except StopIteration as e:
                    raise  # just fwd
                except RuntimeError as e:
                    raise  # just fwd
                except Exception as e:
                    tb = traceback.format_exc()
                    error("Exception:", str(tb))
                    error("Could not reduce data set: " + str(new_data))
                i += 1
                process("CollectSamples | ", i, sample_size)

            # now we use returnDataListNonBlocking on all secondary data providers
            if hasattr(wf, "secondary_data_providers"):
                for cp in wf.secondary_data_providers:
                    new_data = cp["instance"].returnDataListNonBlocking()
                    idx = wf.secondary_data_providers.index(cp)
                    # just get the name of the variable from (cp) and pass it to (nd, wf, idx)
                    for nd in new_data:
                        try:
                            wf = cp["data_reducer"](nd, wf, idx)
                        except StopIteration as e:
                            raise  # just
                        except RuntimeError as e:
                            raise  # just fwd
                        except Exception as e:
                            tb = traceback.format_exc()
                            error("Exception:", str(tb))
                            error("Could not reduce data set: " + str(nd))
    except StopIteration as e:
        # this iteration should stop asap
        error("This stage got stopped as requested by the StopIteration exception:" + str(e))
    try:
        result = wf.evaluator(wf)
    except Exception as e:
        result = 0
        error("Exception in workflow evaluator", str(e))
        tb = traceback.format_exc()
        error("Evaluator failed", str(tb))
    # we store the counter of this experiment in the workflow
    if hasattr(wf, "experimentCounter"):
        wf.experimentCounter += 1
    else:
        wf.experimentCounter = 1

    duration = current_milli_time() - start_time
    wf.remaining_time_and_stages['remaining_stages'] = wf.totalExperiments - wf.experimentCounter
    wf.remaining_time_and_stages['remaining_time'] = str(wf.remaining_time_and_stages['remaining_stages'] * duration / 1000)

    # do not show stats for forever strategy
    if wf.totalExperiments > 0:
        info("> Statistics     | " + str(wf.experimentCounter) + "/" + str(wf.totalExperiments)
             + " took " + str(duration) + "ms" + " - remaining ~" + wf.remaining_time_and_stages['remaining_time'] + "sec")
    # info("> FullState      | " + str(exp["state"]))
    info("> ResultValue    | " + str(result))

    return result
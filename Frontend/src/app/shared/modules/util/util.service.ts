import {Injectable} from "@angular/core";
import * as moment from "moment";
import {isNullOrUndefined} from "util";

@Injectable()
/** This class provides methods that can be considered as side/utility */
export class UtilService {

  /** Parses date of object[attribute] or date string using provided or default format */
  public format_date(object: any, attribute: string, output_date_format: any): any {
    let output_format = "";
    if(isNullOrUndefined(output_date_format)) {
      output_format = "YYYY-MM-DD HH:mm";
    }
    if (!isNullOrUndefined(attribute)) {
      if (object instanceof Array) {
        object.forEach(function(item) {
          let date = item[attribute];
          item[attribute] = moment(date).format(output_format);
        });
        return object;
      }
    } else {
      // provided object should be date string itself
      return moment(object.toString(), output_format);
    }
  }

  /** Counts number of decimals of a given floating point value */
  public countDecimals (value: number) {
    if ((value % 1) != 0)
      return value.toString().split(".")[1].length;
    return 0;
  };



}


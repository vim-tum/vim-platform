import {AuthHttp} from "angular2-jwt";
import {NotificationsService} from "angular2-notifications";
import {LoggerService} from "../modules/helper/logger.service";
import {Http} from "@angular/http";
import {Injectable} from "@angular/core";

@Injectable()
export class ResourceService {


  constructor() {

  }

  getPathInS3Bucket(resource_file_type) {
    var path_in_bucket = "simulation-resources-";
    switch (resource_file_type) {
      case "RoadMap":
        path_in_bucket += "maps";
        break;
      case "Input":
        path_in_bucket += "inputs";
        break;
      case "Other":
        path_in_bucket += "others";
        break;
      default:
        break;
    }
    return path_in_bucket;
  }
}

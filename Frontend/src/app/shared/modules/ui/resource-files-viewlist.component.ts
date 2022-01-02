import {Component, Input, OnInit, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {AlgorithmService} from "../../util/algorithm-service";
import {LabeledInputArrayComponent} from "./labeled-input-array.component";
import {isNullOrUndefined} from "util";
import {OEDAApiService} from "../api/oeda-api.service";
import {ResourceService} from "../../util/resource-service";

@Component({
  selector: 'resource-files-viewlist',
  template: `
    <div class="col-md-12">
      <div class="panel panel-default chartJs">
        <div class="panel-heading">
          <div class="card-title">
            <div class="title pull-left">Resource files used for simulation:</div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="table table-striped table-bordered table-hover">
              <thead>
              <th>Type</th>
              <th>Name</th>
              <th>Download</th>
              <th>Info</th>
              </thead>
              <tbody>
              <tr *ngFor="let resource of experiment.simulation.resources">
                <td>{{resource.type}}</td>
                <td>{{resource.name}}</td>
                <td> <a
                  class="btn btn-xs btn-orange"
                  type="button"
                  data-toggle="modal"
                  title="Download the resource file"
                  (click)="downloadResource(resource.type, resource.name)"
                ><i class="fa fa-download"></i> Download
                </a></td>
                <td>
                  <div class="btn btn-xs btn-orange" data-toggle="tooltip" [title]="resource.description">
                  <div class="title">
                  <a><i class="fa fa-info fa-lg" style="color: white"></i
                  ></a>
                </div>
                  </div></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})

export class ResourceFilesViewlistComponent implements OnInit {

  @Input() targetSystem: any;
  @Input() experiment: any;

  constructor(private api: OEDAApiService, private resourceService: ResourceService) {
  }

  ngOnInit() {
    this.loadDescriptions();
  }

 downloadResource(resourceType: string, resourceName: string): void {
   this.api
     .getResourceFileLink(resourceType, resourceName)
     .subscribe((presigned_url) => {
       try {
         window.open(presigned_url);
       } catch (error) {
         console.log("Error occurred while openning presigned url : " + error);
       }
     });
 }

 loadDescriptions(): void {
   this.experiment.simulation.resources.forEach((resource) => {
       resource.description = '';
       const path_in_bucket = this.resourceService.getPathInS3Bucket(resource.type);
       const description_file_name = resource.name + ".description";
       this.api
         .getResourceFileDescription(
           path_in_bucket + "-descriptions",
           description_file_name
         ).subscribe((description) => resource.description = description)
     }
   );
 }

}

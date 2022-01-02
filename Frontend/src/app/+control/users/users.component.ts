import {Component, OnInit} from '@angular/core';
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {OEDAApiService, UserEntity, UserRole} from "../../shared/modules/api/oeda-api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {EntityService} from "../../shared/util/entity-service";
import {UtilService} from "../../shared/modules/util/util.service";
import {NotificationsService} from "angular2-notifications";

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  users: Array<UserEntity>;
  searchedUsers: Array<UserEntity>;

  selectedUser: UserEntity;
  action: string;

  searchText = '';

  roles: UserRole[];
  dropdownList = [];
  selectedItems = [];

  dropdownSettings = {
    singleSelection: false,
    text: "Select Roles",
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    enableSearchFilter: true,
    classes: "myclass custom-class"
  };

  constructor(private layout: LayoutService,
              private api: OEDAApiService, private router: Router, private route: ActivatedRoute,
              private entity: EntityService, private utilService: UtilService, private notify: NotificationsService) {
    this.layout.setHeader("Users", "Users management dashboard");
  }

  ngOnInit() {
    this.api.getRoles().subscribe(
      (data) => {
        this.roles = data.roles;
        this.roles.forEach((role) => this.dropdownList.push({"id": role.role_id, "itemName": role.name}))
        this.dropdownList.push({"id": -1, "itemName": "None"});
        this.loadData();
      }
    )
  }

  loadData(): void {
    this.api.getUsers().subscribe((users) => {
      this.users = this.utilService.format_date(users, 'created_at', null);
      this.route.queryParams.subscribe(params => {
        const username = params['username'];
        this.action = params['action'];
        this.searchText = params['searchText']
        this.selectedItems = [];

        if (params['searchRoles']) {
          let searchRoles = [];
          if (Array.isArray(params['searchRoles'])) {
            searchRoles = params['searchRoles'];
          } else {
            searchRoles.push(params['searchRoles']);
          }
          searchRoles.forEach((searched) => {
            const found = this.dropdownList.find((role) => role.itemName === searched);
            this.selectedItems.push({'id': found.id, 'itemName': found.itemName});
          })
        }

        if (this.action === 'edit' && username) {
          this.selectedUser = this.users.find(user => user.name === username);
        } else if (this.action === 'add') {
          this.selectedUser = this.entity.create_user_entity();
        } else {
          this.action = null;
          this.selectedUser = null;
        }
        this.doFilter();
      });
    });
  }

  editUser(username: string) {
    this.router.navigate(['control', 'users'], {queryParams: {username: username, action: 'edit'}, queryParamsHandling: "merge"});
  }

  createUser() {
    this.router.navigate(['control', 'users'], {queryParams: {username: '', action: 'add'}, queryParamsHandling: "merge"});
  }

  editRoles() {
    this.router.navigate(['control', 'users', 'roles']);
  }

  search(): void {
    const queryParams = {searchText: '', searchRoles: []};
    if (this.searchText && this.searchText.length > 0) {
      queryParams.searchText = this.searchText;
    }
    if (this.selectedItems) {
      this.selectedItems.forEach((role) => {
        queryParams.searchRoles.push(role.itemName)
      });
    }
    this.router.navigate(['control', 'users'], {queryParams: queryParams, queryParamsHandling: "merge"});
  }

  doFilter(): void {
    this.searchedUsers = this.users.filter((user) => this.nameFilter(user) && this.roleFilter(user));
  }

  nameFilter(user: UserEntity): boolean {
    return !this.searchText || this.searchText.length === 0 || user.name.toLowerCase().indexOf(this.searchText.toLowerCase()) !== -1;
  }

  roleFilter(user: UserEntity): boolean {
    return !this.selectedItems || this.selectedItems.length === 0 || this.selectedItems.some((searchedRole) => {
      return (searchedRole.itemName === 'None' && user.roles.length === 0)
        || user.roles.some((role) => role.name === searchedRole.itemName)
    })
  }

  deleteUser(user: UserEntity): void {
    this.api.deleteUser(user).subscribe((success) => {
      this.notify.success("User " + user.name + " deleted successfully!");
      this.loadData();
    },
      (error) => {
        this.notify.success("Error: Deleting user " + user.name + " failed!");
      })
  }
}

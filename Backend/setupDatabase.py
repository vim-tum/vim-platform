from oeda.databases import setup_role_based_access_control

# Used to setup permissions and basic roles
# add one Admin account: {username: Admin, password: Admin}
# Please change on production!

# Danger!!! Drops on run all previous role configuration

setup_role_based_access_control()
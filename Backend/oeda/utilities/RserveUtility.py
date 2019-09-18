import pyRserve as R

packages_to_be_installed = ['base', 'ggplot2', 'smoof', 'mlr', 'mlrMBO', 'DiceKriging', 'randomForest', 'ParamHelpers', 'stats', 'rgenoud', 'lhs', 'methods', 'emoa']

class rServe:
    conn = None

    def __init__(self):
        self.connect()

    def connect(self):
        self.conn = R.connect()

    def evaluate(self, r_string):
        return self.conn.eval(r_string)

    def shutdown(self):
        return self.conn.shutdown

    def declare_function(self, function_string):
        self.conn.voidEval(function_string)

    def declare_variable(self, name, value):
        setattr(self.conn.r, name, value)

    # https://stackoverflow.com/questions/28110689/how-to-call-an-r-function-with-a-dot-in-its-name-by-pyrserve
    def get_variable(self, name):
        if hasattr(self.conn.r, name):
            return getattr(self.conn.r, name)
        return None

    # Install function for packages
    def install_packages_working(self):
        self.declare_variable("packages", packages_to_be_installed)
        self.conn.voidEval("install_packages <- function(packages) { "
                           " install.packages(packages, repos='http://cran.us.r-project.org')"
                           "}")
        self.conn.r.sapply(packages_to_be_installed, self.conn.r.install_packages)
        print(self.conn.voidEval("library(qqplot2)"))

    def install_packages_test(self):
        self.conn.voidEval("chooseCRANmirror(graphics=FALSE, ind=1)")
        self.conn.voidEval("library('utils')")
        # self.conn.eval("Install_And_Load <- function(Required_Packages)"
        # "{"
        #     "Remaining_Packages <- Required_Packages[!(Required_Packages %in% installed.packages()[,'Package'])];"
        # "if(length(Remaining_Packages)){install.packages(Remaining_Packages, repos='http://cran.us.r-project.org', dependencies:TRUE);}"
        # "for(package_name in Required_Packages){library(package_name,character.only=TRUE,quietly=TRUE);}"
        # "}")
        # self.conn.r.sapply(packages_to_be_installed, self.conn.r.Required_Packages)

    def test2(self):
        # self.evaluate("install.packages('mlrMBO')")
        self.evaluate("library(mlrMBO)")
        self.evaluate("obj_fun = makeSingleObjectiveFunction(name = 'my_sphere',fn = function(x) {sum(x*x) + 7}, par.set = makeParamSet(makeNumericVectorParam('x', len = 2L, lower = -5, upper = 5)), minimize = TRUE)")
        self.evaluate("des = generateDesign(n = 5, par.set = getParamSet(obj_fun), fun = lhs::randomLHS)")
        self.evaluate("surr.km = makeLearner('regr.km', predict.type = 'se', covtype = 'matern3_2', control = list(trace = FALSE))")
        self.evaluate("control = makeMBOControl()")
        self.evaluate("control = setMBOControlTermination(control, iters = 10)")
        self.evaluate("control = setMBOControlInfill(control, crit = makeMBOInfillCritEI())")
        self.evaluate("run = mbo(obj_fun, design = des, learner = surr.km, control = control, show.info = TRUE)")
        run1 = self.evaluate("print(run)")
        print(run1)
        run2 = self.get_variable("run")
        print(run2)

    def test3(self):
        res = self.conn.eval('t.test(c(1,2,3,1),c(1,6,7,8))')
        print(res)
        print(res['conf.int'])

def test_basic_functions():
    print(rServe.evaluate("4+2"))
    print(rServe.declare_function('two <- function(x){ x * 2}'))
    print(rServe.evaluate('two(9)'))
    rServe.declare_variable("x", 15)
    print(rServe.get_variable("x"))
    rServe.declare_variable("name", "ali")
    print(rServe.get_variable("name"))




if __name__ == '__main__':
    rServe = rServe()
    test_basic_functions()
    rServe.test2()
    # rServe.test3()
    # rServe.install_packages_working()
    # rServe.ins tall_packages_test()
    rServe.shutdown()
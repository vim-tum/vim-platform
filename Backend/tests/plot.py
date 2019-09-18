import plotly
import plotly.graph_objs as go
import pandas as pd
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
from matplotlib import cm
from matplotlib.ticker import LinearLocator, FormatStrFormatter
import numpy as np
import pylab

def camel_3(x1, x2):
    term1 = 2 * pow(x1, 2)
    term2 = -1.05 * pow(x1, 4)
    term3 = pow(x1, 6) / 6
    term4 = x1 * x2
    term5 = pow(x2, 2)
    f = term1 + term2 + term3 + term4 + term5
    return f

def matplot1():
    fig = plt.figure()
    ax = fig.gca(projection='3d')

    # Make data.
    X = np.arange(-5, 5, 0.01)
    Y = np.arange(-5, 5, 0.01)
    X, Y = np.meshgrid(X, Y)
    zs = np.array([camel_3(x, y) for x, y in zip(np.ravel(X), np.ravel(Y))])
    Z = zs.reshape(X.shape)

    my_col = cm.jet(Z/np.amax(Z))

    # surf = ax.plot_surface(X, Y, Z, rstride=1, cstride=1, facecolors=my_col,
    #                        linewidth=0, antialiased=False)

    # # Plot the surface.
    surf = ax.plot_surface(X, Y, Z, cmap=cm.coolwarm,
                           linewidth=0, antialiased=False)

    # Customize the z axis.
    ax.set_zlim(0, 2048)
    ax.zaxis.set_major_locator(LinearLocator(10))
    # ax.zaxis.set_major_formatter(FormatStrFormatter('%.02f'))

    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_zlabel('f(x, y)')

    # Add a color bar which maps values to colors.
    fig.colorbar(surf, shrink=0.5, aspect=5)

    plt.show()
    fig.savefig("plot55.pdf", bbox_inches='tight')

def plotly():
    plotly.offline.plot({
        "data": [go.Scatter(x=[1, 2, 3, 4], y=[4, 3, 2, 1])],
        "layout": go.Layout(title="hello world")
    })

def matplot2():
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    x = y = np.arange(-2.0, 2.0, 0.005)
    X, Y = np.meshgrid(x, y)
    zs = np.array([camel_3(x, y) for x, y in zip(np.ravel(X), np.ravel(Y))])
    Z = zs.reshape(X.shape)

    ax.plot_surface(X, Y, Z)

    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_zlabel('f(x, y)')

    plt.show()

if __name__ == '__main__':
    print(camel_3(5, 5))
    matplot1()

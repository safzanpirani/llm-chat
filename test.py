# Complex mathematical functions in Python
import math
from functools import lru_cache
from typing import List, Tuple, Callable, Optional
import cmath


def newton_raphson(f: Callable[[float], float], df: Callable[[float], float], 
                   x0: float, tol: float = 1e-10, max_iter: int = 100) -> float:
    """Finds root of f(x) using Newton-Raphson method with derivative df."""
    x = x0
    for _ in range(max_iter):
        fx, dfx = f(x), df(x)
        if abs(dfx) < 1e-15:
            raise ValueError("Derivative too small; method may not converge")
        x_new = x - fx / dfx
        if abs(x_new - x) < tol:
            return x_new
        x = x_new
    raise ValueError(f"Failed to converge after {max_iter} iterations")


def gaussian_quadrature(f: Callable[[float], float], a: float, b: float, n: int = 5) -> float:
    """Computes definite integral of f from a to b using Gauss-Legendre quadrature."""
    # Legendre polynomial roots and weights for n=5
    nodes = [-0.9061798459, -0.5384693101, 0.0, 0.5384693101, 0.9061798459]
    weights = [0.2369268851, 0.4786286705, 0.5688888889, 0.4786286705, 0.2369268851]
    
    # Transform from [-1,1] to [a,b]
    mid, half = (a + b) / 2, (b - a) / 2
    return half * sum(w * f(mid + half * x) for x, w in zip(nodes[:n], weights[:n]))


def runge_kutta_4(f: Callable[[float, float], float], y0: float, 
                  t_span: Tuple[float, float], h: float = 0.01) -> List[Tuple[float, float]]:
    """Solves ODE dy/dt = f(t, y) using 4th-order Runge-Kutta method."""
    t0, tf = t_span
    t, y = t0, y0
    trajectory = [(t, y)]
    
    while t < tf:
        if t + h > tf:
            h = tf - t
        k1 = h * f(t, y)
        k2 = h * f(t + h/2, y + k1/2)
        k3 = h * f(t + h/2, y + k2/2)
        k4 = h * f(t + h, y + k3)
        y += (k1 + 2*k2 + 2*k3 + k4) / 6
        t += h
        trajectory.append((t, y))
    return trajectory


@lru_cache(maxsize=1000)
def gamma_lanczos(z: complex) -> complex:
    """Computes Gamma function using Lanczos approximation for complex numbers."""
    g = 7
    coefficients = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ]
    
    if z.real < 0.5:
        return cmath.pi / (cmath.sin(cmath.pi * z) * gamma_lanczos(1 - z))
    
    z -= 1
    x = coefficients[0]
    for i in range(1, g + 2):
        x += coefficients[i] / (z + i)
    
    t = z + g + 0.5
    return cmath.sqrt(2 * cmath.pi) * t**(z + 0.5) * cmath.exp(-t) * x


def fast_fourier_transform(x: List[complex]) -> List[complex]:
    """Computes FFT using Cooley-Tukey radix-2 decimation-in-time algorithm."""
    n = len(x)
    if n <= 1:
        return x
    if n & (n - 1):
        raise ValueError("Length must be a power of 2")
    
    even = fast_fourier_transform(x[0::2])
    odd = fast_fourier_transform(x[1::2])
    
    twiddle = [cmath.exp(-2j * cmath.pi * k / n) * odd[k] for k in range(n // 2)]
    return [even[k] + twiddle[k] for k in range(n // 2)] + \
           [even[k] - twiddle[k] for k in range(n // 2)]


def matrix_lu_decomposition(A: List[List[float]]) -> Tuple[List[List[float]], List[List[float]], List[int]]:
    """LU decomposition with partial pivoting. Returns L, U, and permutation vector."""
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    U = [row[:] for row in A]
    P = list(range(n))
    
    for k in range(n - 1):
        # Partial pivoting
        max_idx = max(range(k, n), key=lambda i: abs(U[i][k]))
        if abs(U[max_idx][k]) < 1e-15:
            raise ValueError("Matrix is singular")
        U[k], U[max_idx] = U[max_idx], U[k]
        L[k], L[max_idx] = L[max_idx], L[k]
        P[k], P[max_idx] = P[max_idx], P[k]
        
        for i in range(k + 1, n):
            L[i][k] = U[i][k] / U[k][k]
            for j in range(k, n):
                U[i][j] -= L[i][k] * U[k][j]
    
    for i in range(n):
        L[i][i] = 1.0
    return L, U, P


def continued_fraction_sqrt(n: int, max_terms: int = 50) -> Tuple[int, List[int]]:
    """Computes continued fraction expansion of sqrt(n). Returns (a0, [period])."""
    if int(math.sqrt(n)) ** 2 == n:
        return (int(math.sqrt(n)), [])
    
    a0 = int(math.sqrt(n))
    period = []
    seen = {}
    m, d, a = 0, 1, a0
    
    for _ in range(max_terms):
        m = d * a - m
        d = (n - m * m) // d
        a = (a0 + m) // d
        
        state = (m, d)
        if state in seen:
            break
        seen[state] = len(period)
        period.append(a)
    
    return (a0, period)


def miller_rabin_primality(n: int, k: int = 40) -> bool:
    """Probabilistic primality test using Miller-Rabin with k rounds."""
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False
    
    # Write n-1 as 2^r * d
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2
    
    def check_witness(a: int) -> bool:
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            return True
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                return True
        return False
    
    # Deterministic witnesses for n < 3,317,044,064,679,887,385,961,981
    witnesses = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    return all(check_witness(a) for a in witnesses if a < n)


def pollard_rho_factorization(n: int) -> Optional[int]:
    """Finds a non-trivial factor of n using Pollard's rho algorithm."""
    if n % 2 == 0:
        return 2
    
    x, y, c = 2, 2, 1
    f = lambda x: (x * x + c) % n
    d = 1
    
    while d == 1:
        x = f(x)
        y = f(f(y))
        d = math.gcd(abs(x - y), n)
        if d == n:
            c += 1
            x, y = 2, 2
            if c > 20:
                return None
    
    return d if d != n else None


def lagrange_interpolation(points: List[Tuple[float, float]], x: float) -> float:
    """Evaluates polynomial passing through given points at x using Lagrange form."""
    n = len(points)
    result = 0.0
    
    for i in range(n):
        xi, yi = points[i]
        term = yi
        for j in range(n):
            if i != j:
                xj, _ = points[j]
                term *= (x - xj) / (xi - xj)
        result += term
    
    return result


def jacobi_eigenvalue(A: List[List[float]], tol: float = 1e-10, 
                      max_iter: int = 100) -> Tuple[List[float], List[List[float]]]:
    """Computes eigenvalues and eigenvectors of symmetric matrix using Jacobi method."""
    n = len(A)
    A = [row[:] for row in A]  # Copy
    V = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    
    for _ in range(max_iter):
        # Find largest off-diagonal element
        max_val, p, q = 0, 0, 1
        for i in range(n):
            for j in range(i + 1, n):
                if abs(A[i][j]) > max_val:
                    max_val, p, q = abs(A[i][j]), i, j
        
        if max_val < tol:
            break
        
        # Compute rotation angle
        if abs(A[p][p] - A[q][q]) < 1e-15:
            theta = math.pi / 4
        else:
            theta = 0.5 * math.atan(2 * A[p][q] / (A[p][p] - A[q][q]))
        
        c, s = math.cos(theta), math.sin(theta)
        
        # Apply rotation to A and V
        for i in range(n):
            if i != p and i != q:
                aip, aiq = A[i][p], A[i][q]
                A[i][p] = A[p][i] = c * aip - s * aiq
                A[i][q] = A[q][i] = s * aip + c * aiq
            vip, viq = V[i][p], V[i][q]
            V[i][p] = c * vip - s * viq
            V[i][q] = s * vip + c * viq
        
        app, aqq, apq = A[p][p], A[q][q], A[p][q]
        A[p][p] = c*c*app - 2*s*c*apq + s*s*aqq
        A[q][q] = s*s*app + 2*s*c*apq + c*c*aqq
        A[p][q] = A[q][p] = 0
    
    return [A[i][i] for i in range(n)], V

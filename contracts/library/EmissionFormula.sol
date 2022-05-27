pragma solidity ^0.8.0;
import {UniV2Math} from "./UniV2Math.sol";

library EmissionFormula {
    using UniV2Math for uint256;

    function getCoefficientU(
        uint256 X,
        uint256 Y,
        uint256 Z
    ) internal pure returns (uint256) {
        uint256 k = ((Y - Z) * 10**9) / (Z - X);
        return k - (k * k - 10**18).sqrt();
    }

    function getCoefficientC(uint256 u, uint256 m)
        internal
        pure
        returns (uint256)
    {
        return ((((m - 1) * 10**18) / (u + 10**9))**2) / 10**16;
    }

    function getCoefficientB(uint256 u, uint256 m)
        internal
        pure
        returns (uint256)
    {
        return (((m - 1) * u) * 100) / (u + 10**9);
    }

    function getCoefficientA(
        uint256 Y,
        uint256 Z,
        uint256 u,
        uint256 m
    ) internal pure returns (uint256) {
        return (2 * (Y - Z) * (m - 1) * (10**11)) / (u + 10**9);
    }

    function getEmissionPerSecond(
        uint256 nftCounts,
        uint256 X,
        uint256 Y,
        uint256 Z,
        uint256 m
    ) internal pure returns (uint256) {
        uint256 u = getCoefficientU(X, Y, Z); // decimal 9
        uint256 a = getCoefficientA(Y, Z, u, m); // decimal 2
        uint256 b = getCoefficientB(u, m); // decimal 2
        uint256 c = getCoefficientC(u, m); // decimal 2
        uint256 numerator;
        uint256 denominator;
        nftCounts = nftCounts * 100; // decimal 2
        if (nftCounts > b + 100) {
            uint256 temp = (nftCounts - b - 100); // decimal 2
            numerator = a * temp; // decimal 4
            denominator = temp**2 / 100 + c; // decimal 2
            return ((numerator / denominator) + Z * 100) / 100;
        } else {
            uint256 temp = (b + 100 - nftCounts); // decimal 2
            numerator = a * temp; // decimal 4
            denominator = temp**2 / 100 + c; // decimal 2
            return (Z * 100 - (numerator / denominator)) / 100;
        }
    }
}

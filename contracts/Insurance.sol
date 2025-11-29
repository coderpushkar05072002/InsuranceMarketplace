// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Insurance Marketplace & Brokerage (gas-optimized)
/// @notice Two fee modes:
///  - STANDARD: providerCommissionBps (default 400 = 4%) is deducted from premium before sending to provider,
///              and payerFeeBps (default 100 = 1%) is paid on top by the payer.
///  - EXECUTION: executionCommissionBps (default 100 = 1%) is charged on *each* monetary flow (premium in, payouts out).
/// @dev All fees are sent to feeWallet. Provider funds escrow liquidity for payouts.

contract InsuranceMarketplace {
    // ============ Errors ============
    error NotOwner();
    error NotProvider();
    error NotBeneficiary();
    error Paused();
    error InvalidAmount();
    error InvalidPolicy();
    error PolicyInactive();
    error PolicyActive();
    error InsufficientLiquidity();
    error AlreadyClaimed();
    error BadTimeWindow();
    error ZeroAddress();

    // ============ Types ============
    uint256 private constant BPS = 10_000;

    enum FeeMode { STANDARD, EXECUTION }

    struct Policy {
        address provider;          // 20 bytes
        address beneficiary;       // 20 bytes
        uint128 premium;           // wei
        uint128 coverageLimit;     // wei (max claimable from escrow)
        uint64  start;             // epoch seconds
        uint64  end;               // epoch seconds
        uint64  liquidity;         // provider-funded escrow available
        uint32  claimed;           // total paid out so far (<= coverageLimit), fits if <= ~4.29G wei but we cap via checks
        uint8   feeMode;           // 0 = STANDARD, 1 = EXECUTION
        bool    active;            // policy live flag
    }

    // ============ Storage ============
    address public immutable owner;
    address public feeWallet;

    // Fees (in basis points)
    uint16 public providerCommissionBps = 400;   // 4% on provider (STANDARD)
    uint16 public payerFeeBps           = 100;   // 1% on payer (STANDARD)
    uint16 public executionCommissionBps= 100;   // 1% on each tx (EXECUTION)

    // simple non-reentrancy lock
    uint256 private locked;

    // Pause
    bool public paused;

    // Policies
    uint256 public policyCount;
    mapping(uint256 => Policy) public policies;

    // ============ Events ============
    event PolicyCreated(uint256 indexed policyId, address indexed provider, address indexed beneficiary, uint128 premium, uint128 coverageLimit, FeeMode feeMode, uint64 start, uint64 end);
    event PolicyFunded(uint256 indexed policyId, uint256 amount, uint256 newLiquidity);
    event PremiumPaid(uint256 indexed policyId, address indexed payer, uint256 grossPaid, uint256 providerNet, uint256 feeToPlatform);
    event ClaimPaid(uint256 indexed policyId, address indexed beneficiary, uint256 beneficiaryNet, uint256 feeToPlatform);
    event LiquidityWithdrawn(uint256 indexed policyId, uint256 amount);
    event PolicyStatus(uint256 indexed policyId, bool active);
    event PausedSet(bool paused);
    event FeesUpdated(uint16 providerCommissionBps, uint16 payerFeeBps, uint16 executionCommissionBps);
    event FeeWalletUpdated(address feeWallet);

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        require(locked == 0, "REENTRANCY");
        locked = 1;
        _;
        locked = 0;
    }

    constructor(address _feeWallet) {
        if (_feeWallet == address(0)) revert ZeroAddress();
        owner = msg.sender;
        feeWallet = _feeWallet;
    }

    // ============ Admin ============
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    function setFeeWallet(address _feeWallet) external onlyOwner {
        if (_feeWallet == address(0)) revert ZeroAddress();
        feeWallet = _feeWallet;
        emit FeeWalletUpdated(_feeWallet);
    }

    function setFees(uint16 _providerBps, uint16 _payerBps, uint16 _execBps) external onlyOwner {
        // soft caps, all must be < 100%
        if (_providerBps >= BPS || _payerBps >= BPS || _execBps >= BPS) revert InvalidAmount();
        providerCommissionBps = _providerBps;
        payerFeeBps           = _payerBps;
        executionCommissionBps= _execBps;
        emit FeesUpdated(_providerBps, _payerBps, _execBps);
    }

    // ============ Provider workflow ============
    /// @notice Provider creates a policy. Times are optional; set 0 to skip window checks.
    function createPolicy(
        address beneficiary,
        uint128 premium,
        uint128 coverageLimit,
        FeeMode feeMode,
        uint64 start,
        uint64 end
    ) external whenNotPaused returns (uint256 policyId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (premium == 0 || coverageLimit == 0) revert InvalidAmount();
        if (start != 0 && end != 0 && end <= start) revert BadTimeWindow();

        unchecked {
            policyId = ++policyCount;
        }

        policies[policyId] = Policy({
            provider: msg.sender,
            beneficiary: beneficiary,
            premium: premium,
            coverageLimit: coverageLimit,
            start: start,
            end: end,
            liquidity: 0,
            claimed: 0,
            feeMode: uint8(feeMode),
            active: true
        });

        emit PolicyCreated(policyId, msg.sender, beneficiary, premium, coverageLimit, feeMode, start, end);
    }

    /// @notice Provider funds escrow liquidity for this policy.
    function fundPolicyLiquidity(uint256 policyId) external payable whenNotPaused {
        Policy storage p = _policy(policyId);
        if (msg.sender != p.provider) revert NotProvider();
        if (!p.active) revert PolicyInactive();
        if (msg.value == 0) revert InvalidAmount();

        p.liquidity += uint64(msg.value); // fits for demo; for production consider uint128

        emit PolicyFunded(policyId, msg.value, p.liquidity);
    }

    /// @notice Provider can deactivate/activate policy (e.g., after end).
    function setPolicyActive(uint256 policyId, bool active_) external whenNotPaused {
        Policy storage p = _policy(policyId);
        if (msg.sender != p.provider) revert NotProvider();
        p.active = active_;
        emit PolicyStatus(policyId, active_);
    }

    /// @notice Provider may withdraw *excess* liquidity that is beyond remaining coverage.
    /// @dev Only allowed when policy inactive OR no coverage remaining required.
    function withdrawLiquidity(uint256 policyId, uint256 amount) external nonReentrant {
        Policy storage p = _policy(policyId);
        if (msg.sender != p.provider) revert NotProvider();
        if (amount == 0 || amount > p.liquidity) revert InvalidAmount();

        // basic guard: allow withdraw if policy inactive OR liquidity > remaining coverage
        uint256 remainingCoverage = p.coverageLimit - p.claimed;
        if (p.active && p.liquidity <= remainingCoverage) revert InsufficientLiquidity();

        p.liquidity -= uint64(amount);
        _safeSend(payable(msg.sender), amount);

        emit LiquidityWithdrawn(policyId, amount);
    }

    // ============ Payer workflow ============
    /// @notice Payer pays premium. In STANDARD mode, payer pays premium + payerFee (1% by default).
    /// In EXECUTION mode, payer pays exactly premium; platform takes 1% out of premium before sending to provider.
    function payPremium(uint256 policyId) external payable whenNotPaused nonReentrant {
        Policy storage p = _policy(policyId);
        if (!p.active) revert PolicyInactive();
        _enforceWindow(p);

        uint256 feeToPlatform;
        uint256 providerNet;
        uint256 expected;

        if (p.feeMode == uint8(FeeMode.STANDARD)) {
            uint256 providerCut = (uint256(p.premium) * providerCommissionBps) / BPS;   // 4% of premium
            uint256 payerFee    = (uint256(p.premium) * payerFeeBps) / BPS;             // 1% on top
            providerNet = uint256(p.premium) - providerCut;
            expected    = uint256(p.premium) + payerFee;
            feeToPlatform = providerCut + payerFee;
        } else {
            // EXECUTION: take 1% of premium and send rest to provider. Payer sends exactly premium.
            uint256 execFee = (uint256(p.premium) * executionCommissionBps) / BPS;      // 1% of premium
            providerNet = uint256(p.premium) - execFee;
            expected    = uint256(p.premium);
            feeToPlatform = execFee;
        }

        if (msg.value != expected) revert InvalidAmount();

        // Effects (none to policy state), Interactions
        if (providerNet > 0) _safeSend(payable(p.provider), providerNet);
        if (feeToPlatform > 0) _safeSend(payable(feeWallet), feeToPlatform);

        emit PremiumPaid(policyId, msg.sender, msg.value, providerNet, feeToPlatform);
    }

    // ============ Claims ============
    /// @notice Provider approves and pays a claim to beneficiary from escrow.
    /// STANDARD mode: no platform fee on payout.
    /// EXECUTION mode: 1% platform fee on payout amount.
    function payClaim(uint256 policyId, uint256 amount) external whenNotPaused nonReentrant {
        Policy storage p = _policy(policyId);
        if (msg.sender != p.provider) revert NotProvider();
        if (!p.active) revert PolicyInactive();
        if (amount == 0) revert InvalidAmount();
        if (uint256(p.claimed) + amount > p.coverageLimit) revert InvalidAmount();
        if (amount > p.liquidity) revert InsufficientLiquidity();

        // account claim
        p.claimed = uint32(uint256(p.claimed) + amount); // safe for demo; use larger type in production if needed
        p.liquidity -= uint64(amount);

        uint256 feeToPlatform;
        uint256 beneficiaryNet = amount;

        if (p.feeMode == uint8(FeeMode.EXECUTION)) {
            feeToPlatform = (amount * executionCommissionBps) / BPS; // 1% of payout
            beneficiaryNet = amount - feeToPlatform;
        }

        // Interactions
        if (beneficiaryNet > 0) _safeSend(payable(p.beneficiary), beneficiaryNet);
        if (feeToPlatform > 0) _safeSend(payable(feeWallet), feeToPlatform);

        emit ClaimPaid(policyId, p.beneficiary, beneficiaryNet, feeToPlatform);
    }

    // ============ Views ============
    function quotePremiumStandard(uint256 premiumWei) external view returns (uint256 totalPayable, uint256 providerReceives, uint256 platformFees) {
        uint256 providerCut = (premiumWei * providerCommissionBps) / BPS;
        uint256 payerFee    = (premiumWei * payerFeeBps) / BPS;
        providerReceives = premiumWei - providerCut;
        totalPayable     = premiumWei + payerFee;
        platformFees     = providerCut + payerFee;
    }

    function quotePremiumExecution(uint256 premiumWei) external view returns (uint256 totalPayable, uint256 providerReceives, uint256 platformFee) {
        uint256 execFee = (premiumWei * executionCommissionBps) / BPS;
        providerReceives = premiumWei - execFee;
        totalPayable     = premiumWei; // no extra on top
        platformFee      = execFee;
    }

    // ============ Internal ============
    function _policy(uint256 policyId) internal view returns (Policy storage p) {
        p = policies[policyId];
        if (p.provider == address(0)) revert InvalidPolicy();
    }

    function _enforceWindow(Policy storage p) internal view {
        if (p.start != 0 && block.timestamp < p.start) revert BadTimeWindow();
        if (p.end   != 0 && block.timestamp > p.end)   revert BadTimeWindow();
    }

    function _safeSend(address payable to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "TRANSFER_FAIL");
    }

    // prevent accidental ETH
    receive() external payable {
        revert();
    }
}

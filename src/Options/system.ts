const SETTINGS = {
    MaxDrawDownPerWeek: "6%",
    Risk: "1%",
    maxOpenRisk: "6%",
    botReactionSpeed: 10, // How many trades / time should you average the profit over
    numberOfSimultatiousStrategies: 5,
    strategyCutoff: "+0.2R", // How many x risk in profit should be made on average to consider the strategy profitable (or instead you could do some normal distribution thing again)
};

export default SETTINGS;

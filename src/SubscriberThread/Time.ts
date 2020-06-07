enum Time {
    YEAR = "YEAR", MONTH = "MONTH", WEEK = "WEEK", DAY = "DAY", HOUR = "HOUR", MINUTE = "MINUTE", SECOND = "SECOND", MILLISECOND = "MILLISECOND"
}


function addTime(initial: Date, amount: number, measurement: Time): Date {
    let newTime = new Date(initial);
    switch (measurement) {
    case Time.YEAR:
        newTime.setFullYear(initial.getFullYear() + amount);
        break;
    case Time.MONTH:
        newTime.setMonth(initial.getMonth() + amount);
        break;
    case Time.WEEK:
        newTime.setDate(initial.getDate() + (amount * 7));
        break;
    case Time.DAY:
        newTime.setDate(initial.getDate() + amount);
        break;
    case Time.HOUR:
        newTime.setHours(initial.getHours() + amount);
        break;
    case Time.MINUTE:
        newTime.setMinutes(initial.getMinutes() + amount);
        break;
    case Time.SECOND:
        newTime.setSeconds(initial.getSeconds() + amount);
        break;
    case Time.MILLISECOND:
        newTime.setMilliseconds(initial.getMilliseconds() + amount);
        break;
    default:
        console.error(`${measurement} is not a valid time measurement...`);
    }
    return newTime;
}

/**
 * Amount and measurement params make up the interval
 */
function getStartTime(startTick: Date, amount: number, measurement: Time): Date {
    let start = new Date(startTick);
    // TODO: check amount doesn't go over certain threshold, e.g. More than 60 minutes goes into hours

    let newMeasurement = measurement;
    if (amount > 1) {
        const arr = Object.keys(Time);
        let index = arr.findIndex((val) => measurement === val);
        index = (arr.length + (index - 1)) % arr.length;
        newMeasurement = arr[index] as Time;
    }
    switch (newMeasurement) {
    case Time.YEAR:
        start = new Date(start.getFullYear(), 1);
        break;
    case Time.MONTH:
        start = new Date(start.getFullYear(), start.getMonth());
        break;
    case Time.WEEK:
        start = new Date(start.getFullYear(), start.getMonth());
        break;
    case Time.DAY:
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        break;
    case Time.HOUR:
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours());
        break;
    case Time.MINUTE:
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes());
        break;
    case Time.SECOND:
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
        break;
    case Time.MILLISECOND:
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        break;
    default:
        console.error(`${measurement} is not a valid time measurement...`);
    }

    while (true) {
        const temp = addTime(start, amount, measurement);
        if (temp > startTick) break;
        start = temp;
    }

    return start;
}

export { getStartTime, Time, addTime };

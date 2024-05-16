function centisecondsToTime(centiseconds) {
    if (centiseconds === -1) {
        return 'DNF';
    }

    centiseconds = Math.floor(centiseconds);
    const minutes = Math.floor(centiseconds / 6000);
    centiseconds %= 6000;
    const seconds = Math.floor(centiseconds / 100);
    centiseconds %= 100;

	const padCentiseconds = String(centiseconds).padStart(2, '0')
	const padseconds = String(seconds).padStart(2, '0')

    if (minutes > 0) {
        return `${minutes}:${padseconds}.${padCentiseconds}`;
    } 
    if (seconds > 0) {
        return `${seconds}.${padCentiseconds}`;
    }

    return `0.${padCentiseconds}`;
}

function timeToCentiseconds(time) {
    //EXAMPLES
    //input -> interpertation (not output)
    //3 -> 3.00
    //231 -> 2.31
    //00.234 -> 0.23
    if (time.toLowerCase() === 'dnf') {
        return -1;
    }

	let minutes = 0;
	if (time.includes(':')) {
		minutes = parseInt(time.split(':')[0]);
		time = time.split(':')[1];
    }

    if (time.includes('.') || time.length <=2 ) {
        return minutes * 6000 + Math.floor(parseFloat(time)) * 100
    }

	return minutes * 6000 + Math.floor(parseFloat(time));
}

function isValidTime(time){
    //checks if a time can be converted to centiseconds and back to time foramt
    return !centisecondsToTime(timeToCentiseconds(time)).includes('NaN')
}

function wcaAverage(timesArr) {
    const sum = arr => arr.reduce((acc, curr) => acc + curr, 0);

    let times = timesArr.slice(0, 5);
    if (times.filter(time => time === -1).length > 1) {
        return -1;
    }
    times = times.map(time => time === -1 ? 999999 : time);
    
    return (sum(times)-Math.max(...times)-Math.min(...times))/3;
}

function bpa(timesArr) {
    const sum = arr => arr.reduce((acc, curr) => acc + curr, 0);
    let times = timesArr.slice(0, 4);
    if (times.filter(i => i === -1).length > 1) {
        return -1;
    }

    times = times.map(time => time === -1 ? 999999 : time);
    return (sum(times)-Math.max(...times))/3;
}

function wpa(timesArr) {
    const sum = arr => arr.reduce((acc, curr) => acc + curr, 0);
    const times = timesArr.slice(0, 4);
    if (times.filter(i => i === -1).length > 0) {
        return -1;
    }

    return (sum(times)-Math.min(...times))/3;
}

function mean(timesArr) {
    const sum = arr => arr.reduce((acc, curr) => acc + curr, 0);
    if (timesArr.filter(i => i === -1).length > 0) {
        return -1;
    }
    return sum(timesArr)/timesArr.length
}

module.exports = {
    centisecondsToTime,
    timeToCentiseconds,
    isValidTime,
    wcaAverage,
    bpa,
    wpa,
    mean,
};


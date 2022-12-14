function getFormatForTemporality(temporality) {
    switch(temporality) {
        case "1y": return "YYYY";
        case "1d": return "YYYY-MM-DD";
        case "free": return "YYYY-MM-DD HH:mm:SS";
        default: throw "Temporalidad '" + temporality + "' no soportada con un formato";
    }
}

function normalizeTimeForTemporality(temporality, time) {
    switch(temporality) {
        case "1y": return time.startOf("year");
        case "1m": return time.startOf("month");
        case "1d": return time.startOf("day");
        case "1h": return time.startOf("hour");
        default: throw "Temporalidad '" + temporality + "' no soportada para normalizar";
    }
}
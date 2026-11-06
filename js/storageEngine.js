function saveToBrowserStorage() {

    localStorage.setItem(
        "SeaServiceRecord",
        JSON.stringify(
            buildRecordObject()
        )
    );

}

function loadFromBrowserStorage() {

    const data =
        localStorage.getItem(
            "SeaServiceRecord"
        );

    if (!data)
        return null;

    return JSON.parse(data);

}

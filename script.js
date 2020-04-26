//a cache of the downloaded episode list, for filtering
let allEpisodes;
let allShows = getAllShows();
let selectedShow;

function setup() {
    document
        .getElementById("searchInput")
        .addEventListener("input", triggerEpisodeSearchFromGUI);

    document.getElementById("showsSearchInput").addEventListener("input", triggerShowSearchFromGUI);
    document.getElementById("listShowsLink").addEventListener("click", switchToShowsListing);

    sortShowsByName(allShows);
    switchToShowsListing();

    registerSpeechRecognitionListener(processCommand);
    console.log("started recognition tool");
}

function selectShowByName(showNameMaybe) {
    const foundShow = allShows.find(candidate => candidate.name.toLowerCase() === showNameMaybe.toLowerCase());
    if (foundShow) {
        handleChosenShow(foundShow.id, foundShow.name);
    }
}

function pick(arr) {
    if (arr.length < 1) {
        return undefined;
    }
    return arr[Math.floor(Math.random() * arr.length - 1)];
}

function selectRandomShow() {
    const foundShow = pick(allShows);
    handleChosenShow(foundShow.id, foundShow.name);
}

function selectEpisodeByNumber(seasonNumber, episodeNumber) {
    const foundEpisode = allEpisodes.find(candidate => candidate.season === seasonNumber && candidate.number === episodeNumber);
    if (foundEpisode) {
        selectChosenEpisode(foundEpisode);
    } else {
        console.log("can't find episode s ${seasonNumber} e ${episodeNumber}")
    }
}
function registerSpeechRecognitionListener(processPhraseCallback) {
    //based on code demoed at this wes bos talk
    //https://www.youtube.com/watch?v=pws4qzGn5ak

    //Create the speech recognition object
    window.SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    let p = document.createElement("p");
    const words = document.querySelector(".words");
    words.appendChild(p);

    recognition.addEventListener("result", (e) => {
        const transcript = Array.from(e.results)
            .map((result) => result[0]) //just the highest confidence guess
            .map((result) => result.transcript)
            .join("");

        p.textContent = transcript;

        if (e.results[0].isFinal) {
            processPhraseCallback(transcript);
            //when exactly is isFinal set?
        }
    });

    //only if we want to keep going after first phrase end is detected
    recognition.addEventListener("end", recognition.start);
    recognition.start();
}


const voiceCommands = [
    {
        title: "show everything",
        regex: /show(?: me)? everything|show all shows/gi,
        fn: (matches) => {
            //show all shows (remove any filter)
            console.log("Showing all shows...");
            switchToShowsListing();
        }
    },
    {
        title: "show all episodes",
        regex: /show(?: me)? all episodes/gi,
        fn: (matches) => {
            //show all episodes (remove any filter)
            console.log("Would show all episodes");
            showAllEpisodes();
        }
    },
    {
        title: "select a random show",
        regex: /select a random show|show me anything/gi,
        fn: (matches) => {
            console.log("Showing a random show...");
            selectRandomShow();
        }
    },
    {
        title: "Show season _ episode _",
        regex: /season (\d+) episode (\d+)/gi,
        fn: (matches) =>
            //DO an episode change
            selectEpisodeByNumber(Number(matches[1]), Number(matches[2]))
    },
    {
        title: "Show season _",
        regex: /show(?: me)? season (\d+)/gi,
        fn: (matches) => {
            //DO a filtering of episodes
            console.log("Present all episodes in season number: " + matches[1]);
            showSeason(Number(matches[1]));
        },
    },
    {
        title: "search episodes for _",
        regex: /search episodes for (.*)/gi,
        fn: (matches) =>
            //DO a search
            runEpisodeSearchForText(matches[1])

    },
    {
        title: "search shows for _",
        regex: /search shows for (.*)/gi,
        fn: (matches) => {
            //DO a search
            switchToShowsListing();
            runShowSearchForText(matches[1])
        }

    },
    {
        title: "Show _",
        regex: /show(?: me)? (.*)/gi,
        fn: (matches) => {
            //pick that show if we can find it
            console.log("Present the show called: " + matches[1]);
            //TODO: 
            selectShowByName(matches[1]);


        },

    },
    {
        title: "Help|What can i say?",
        regex: /what can i say|help/gi,
        //display help dialog of what can be said
        fn: (matches) =>
            displayVoiceHelpDialog()
    },
    {
        title: "dismiss|Hide the help",
        regex: /dismiss|hide the help/gi,
        //hide help dialog of what can be said
        fn: (matches) =>
            hideVoiceHelpDialog()
    },

];
function displayVoiceHelpDialog() {
    const dialog = document.getElementById("voiceCommandsHelpDialog");
    dialog.hidden = false;
    const listEl = dialog.querySelector("ul")
    listEl.textContent = "";
    voiceCommands.map((c) => {
        const el = listEl.appendChild(document.createElement("li"))
        el.textContent = c.title;
    });
}

function hideVoiceHelpDialog() {
    console.log("hiding voice command help dialog")
    document.getElementById("voiceCommandsHelpDialog").hidden = true;

}
function processCommand(transcript) {
    let els = document.querySelectorAll(".words");
    els.forEach(el => el.textContent = "Cmd: " + transcript);


    const matchedCmd = voiceCommands.find(
        (cmd) => [...transcript.matchAll(cmd.regex)].length > 0
    );
    if (matchedCmd) {
        let matches = [...transcript.matchAll(matchedCmd.regex)];
        if (matches.length > 0) {
            console.log("got a match.  matches are: ", matches[0]);
            console.log(matchedCmd.fn(matches[0]));
        } else {
            console.error(
                "cmd was selected but then doesn't match. suspect code error."
            );
        }
    } else {
        ("no command matches that");
    }
}

function showAllEpisodes() {
    //TODO: don't do this if we haven't selected a show
    makePageForEpisodes(allEpisodes);
}

function switchToShowsListing() {
    document.getElementById("showsPage").hidden = false;
    document.getElementById("episodesPage").hidden = true;
    makePageForShows(allShows);
}
function sortShowsByName(allShows) {
    //assumes all shows have a name.
    allShows.sort((a, b) => a.name.localeCompare(b.name));
}



function fetchEpisodesForShow(showId) {
    fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
        .then(resp => resp.json())
        .then(handleEpisodesJSONResponse);
}

function handleEpisodesJSONResponse(json) {
    //we cache the episode list locally for further filtering
    allEpisodes = json;
    makePageForEpisodes(allEpisodes);
}

function triggerEpisodeSearchFromGUI(event) {
    const query = document.getElementById("searchInput").value;
    runEpisodeSearchForText(query);
}

function runEpisodeSearchForText(soughtText) {
    const filtered = allEpisodes.filter(episode =>
        episodeMatchesQuery(episode, soughtText)
    );
    makePageForEpisodes(filtered);
}
function runShowSearchForText(soughtText) {
    const filtered = allShows.filter(show =>
        tvShowMatchesQuery(show, soughtText)
    );
    makePageForShows(filtered);
}

function showSeason(seasonNumber) {
    //don't do this if we haven't a show selected.
    const filtered = allEpisodes.filter(episode =>
        episode.season === seasonNumber
    );
    makePageForEpisodes(filtered);
}
function triggerShowSearchFromGUI(event) {
    const query = document.getElementById("showsSearchInput").value;
    const filtered = allShows.filter(show =>
        tvShowMatchesQuery(show, query)
    );
    makePageForShows(filtered);
}

function contains(inspectStr, targetStr) {
    return inspectStr && targetStr && -1 !== inspectStr.toLowerCase().indexOf(targetStr.toLowerCase());
}

function episodeMatchesQuery(episode, query) {
    return !query || contains(episode.name, query) || contains(episode.summary, query);
}


function tvShowMatchesQuery(show, query) {
    return (
        !query
        || contains(show.name, query)
        || show.genres.some(genre => contains(genre, query))
        || contains(show.summary, query)
    );
}

function handleChosenEpisode(event) {
    let opts = event.target.selectedOptions;
    if (opts.length !== 1) {
        return;
    }
    let id = opts[0].value;
    selectChosenEpisodeById(Number(id));
}
function selectChosenEpisodeById(id) {
    if (allEpisodes) {
        const ep = allEpisodes.find(e => e.id === id);
        if (ep) {
            selectChosenEpisode(ep);
        }
    }
}

function selectChosenEpisode(episode) {

    makePageForEpisodes([episode]);
}

function handleChosenShowFromSelect(event) {
    let opts = event.target.selectedOptions;
    if (opts.length !== 1) {
        return;
    }
    let id = opts[0].value;
    let showName = opts[0].dataset.title;
    handleChosenShow(id, showName);
}

function handleChosenShow(id, showName) {
    fetchEpisodesForShow(Number(id));
    document.getElementById("showTitleHeader").textContent = showName;
    document.getElementById("episodesPage").hidden = false;
    document.getElementById("showsPage").hidden = true;
}

function makeShowSelector(shows) {
    const selectElem = document.getElementById("showSelect");
    selectElem.textContent = ""; //empty it
    selectElem.onchange = handleChosenShowFromSelect;
    shows.forEach(show => {
        //e.g. <option value="82">Game Of Thrones</option>;
        const optionElem = document.createElement("option");
        optionElem.setAttribute("value", show.id);
        optionElem.setAttribute("data-title", show.name);
        optionElem.textContent = show.name;
        selectElem.appendChild(optionElem);
    });
}

function makeEpisodeSelector(episodes) {
    const selectElem = document.getElementById("episodeSelect");
    selectElem.textContent = ""; //empty it
    selectElem.onchange = handleChosenEpisode;
    episodes.forEach(episode => {
        //<option value="S01E01">S01E01 Winter is Coming</option>;
        const optionElem = document.createElement("option");
        const code = makeEpisodeCode(episode);
        optionElem.setAttribute("value", episode.id);
        optionElem.textContent = `${code} - ${episode.name}`;
        selectElem.appendChild(optionElem);
    });
}

function pad(num) {
    return num.toString().padStart(2, "0");
}

function makeEpisodeCode(episode) {
    return `S${pad(episode.season)}E${pad(episode.number)}`;
}

function makePageForEpisodes(json) {
    makeEpisodeSelector(json);

    document.getElementById(
        "countDisplay"
    ).textContent = `Displaying ${json.length}/${allEpisodes.length} episodes.`;

    const container = document.getElementById("episodes");
    container.textContent = ""; //wipe previous content
    json.forEach(episode => {
        const card = makeCardForEpisode(episode);
        container.appendChild(card);
    });
    scrollToTop();
}

function makePageForShows(json) {
    console.log("making page for shows");
    makeShowSelector(json);
    document.getElementById("filterSummary").textContent = json.length.toString();

    const showsListElem = document.getElementById("showsList");

    showsListElem.textContent = ""; //wipe previous content

    json.forEach(show => {
        const card = makeCardForShow(show);
        showsListElem.appendChild(card);
    });
    scrollToTop();
}

function scrollToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

function makeCardForShow(show) {
    //--- Containing... ---
    //Title - linking to episodes view
    //Image
    //Summary
    // (and in info panel)...
    //Genre
    //Rating
    //status

    const li = document.createElement("li");
    li.classList.add("show");

    const aWithTitle = appendNewChild(li, "a");
    //aWithTitle.setAttribute("href", `https://www.tvmaze.com/shows/${show.id}`)
    aWithTitle.addEventListener("click", () => handleChosenShow(show.id, show.name));
    appendNewChild(aWithTitle, "h1").textContent = show.name;

    const div3 = appendNewChild(li, "div");
    div3.classList.add("three-panels");
    const figure = appendNewChild(div3, "figure");
    figure.classList.add("panel", "panel-one");
    const img = appendNewChild(figure, "img");
    img.setAttribute(
        "src",
        show.image ? show.image.medium : "https://placekitten.com/300/200"
    );

    const divMiddle = appendNewChild(div3, "div");
    divMiddle.classList.add("panel", "panel-two");
    divMiddle.textContent = stripTags(show.summary);

    const divRight = appendNewChild(div3, "div");
    divRight.classList.add("panel", "panel-three");
    [{ title: "Rated", fn: show => show.rating.average },
    { title: "Genres", fn: show => show.genres.join(" | ") },
    { title: "Status", fn: show => show.status },
    { title: "Runtime", fn: show => show.runtime }
    ].forEach(info => {
        const p = appendNewChild(divRight, "p");
        const span = appendNewChild(p, "span");
        span.classList.add("info-key");
        span.textContent = info.title + ": ";
        p.appendChild(document.createTextNode(info.fn(show)))
    });

    return li;
}

function appendNewChild(parent, elementType) {
    return parent.appendChild(document.createElement(elementType));
}

function makeCardForEpisode(episode) {
    //--- Containing... ---
    //Title,
    //Image
    //Code (S02E07) and scroll-to-top link
    //Summary (cleaned)   
    const code = makeEpisodeCode(episode);

    const card = document.createElement("div");
    card.classList.add("card");
    card.setAttribute("id", code);

    const h1 = document.createElement("h1");
    h1.classList.add("episodeTitle");
    h1.textContent = `${episode.name} - ${code}`; //` `;

    const img = document.createElement("img");
    img.setAttribute(
        "src",
        episode.image ? episode.image.medium : "https://placekitten.com/300/200"
    );

    const p = document.createElement("p");
    p.textContent = stripTags(episode.summary);

    card.appendChild(h1);
    card.appendChild(img);
    card.appendChild(p);
    return card;
}

//Remove tags by replacing the matched expression with an empty string.
//This function uses a regular expression.  It is NOT important to learn these on the course.
function stripTags(str) {
    if (!str) {
        return str;
    }
    //regex components:
    // <
    // / (optional)
    // a sequence of at least one alphabet character (case insensitive)
    // >
    return str.replace(/<\/?[a-z]+>/gi, "");
}
window.onload = setup;

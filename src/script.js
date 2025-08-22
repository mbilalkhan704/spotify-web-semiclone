// import songsLinks from './songsLinks.json';
// import songsByPlaylist from './songsByPlaylist.json';
const songsLinks = JSON.parse(import.meta.env.VITE_SONGS_LINKS_JSON);
const songsByPlaylist = JSON.parse(import.meta.env.VITE_SONGS_PLAYLISTS_JSON);

const songsListDiv = document.querySelector(".songs-list");
const playlistListDiv = document.querySelector(".playlists-list");
const playbar = document.querySelector(".playbar")
const playbarSongName = document.querySelector(".bottom .playbar .upper-pb .song-info .song-name")
const playbarArtistName = document.querySelector(".bottom .playbar .upper-pb .song-info .artist-name")
const playbarSongDuration = document.querySelector(".bottom .playbar .upper-pb .song-duration p")
const mainPlayButton = document.querySelector('.main-play-button');
const previousButton = document.querySelector('.previous-button');
const nextButton = document.querySelector('.next-button');
const seekbarBall = document.querySelector('.seekbar-ball');
let windowWidth = window.innerWidth;

let isDragging = false;
let offsetXPercent = 0;
let xPercent = 0;
let currentSong = null;
let currentSongUrl = null;
let currentSongId = null
let currentPlaylistId = null


/* -------------------- UTILITIES -------------------- */
function getPlayPauseSVGs(playOrPause, bw = false) {
    if (playOrPause === 'play') {
        return (bw) ? 'images/playbw.svg' : 'images/play.svg'
    }
    else if (playOrPause === 'pause') {
        return (bw) ? 'images/pausebw.svg' : 'images/pause.svg'
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const formattedMinutes = String(mins).padStart(2, "0");
    const formattedSeconds = String(secs).padStart(2, "0");

    if (hrs > 0) {
        const formattedHours = String(hrs).padStart(2, "0");
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
}

function getSongAndArtistName(url) {
    let kw = "artist704"
    let temp = url.split('/')
    let songAndArtistNameTillEnd = temp[temp.length - 1]
    let songAndArtistName = songAndArtistNameTillEnd.split('?')[0].replace(".mp3", '').replaceAll('-', ' ')
    let songNameEndingIndex = songAndArtistName.search(kw)
    let songName = songAndArtistName.slice(0, songNameEndingIndex).trim()
    let tempArtistName = songAndArtistName.slice(songNameEndingIndex)
    let lastArtistNameStartingIndex = tempArtistName.lastIndexOf(kw)
    let artistNames = "by " + tempArtistName.slice(0, lastArtistNameStartingIndex).replace(kw, '').replaceAll(` ${kw}`, ', ')
    if (songNameEndingIndex == lastArtistNameStartingIndex) artistNames += "and "
    artistNames += tempArtistName.slice(lastArtistNameStartingIndex + kw.length)
    return [songName, artistNames]
}

const capitalizer = (str) =>
    str.split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

/* -------------------- PLAYBAR -------------------- */
function togglePlaybar() {
    if (playbar.classList.contains('active')) return;

    const elementsToApply = (windowWidth > 768) ? [playlistListDiv] : [playlistListDiv, document.querySelector('.left .library')];
    const marginValue = `calc(var(--playbar-height) + var(--playbar-bottom-distance))`;

    elementsToApply.forEach(element => {
        element.style.marginBottom = marginValue;
        if (element === playlistListDiv && element.scrollTop + element.clientHeight >= element.scrollHeight - 150) {
            element.scrollTo({
                top: element.scrollHeight,
                behavior: "smooth"
            });
        }
    });
    playbar.classList.add('active');
}



/* -------------------- PLAYLISTS -------------------- */
async function getPlaylistCards() {
    for (const [index, pl] of Object.keys(songsByPlaylist).entries()) {
        const plNameLower = pl.toLowerCase()
        playlistListDiv.innerHTML = playlistListDiv.innerHTML + `<div class="playlist-card flex fd-col of-hidden cursor-pointer br-0p5-rem" data-playlist-id=${index} data-playlist-selected="false" data-playlist-name="${plNameLower}">
                                <div class="pt-top flex ai-center jc-center of-hidden br-0p5-rem pos-r">
                                    <img src="/images/playlists/${plNameLower.replace(/\s+/g, "")}.jpeg" alt="">
                                    <img class="play-btn pos-a" src="images/play.svg" alt="">
                                </div>
                                <div class="pt-bottom flex fd-col of-hidden flex-1">
                                    <h4>${pl}</h4>
                                        <section class="playlist-info flex fd-col of-hidden">
                                                <p>${songsByPlaylist[pl].tagline}</p>
                                        </section>
                                </div>
                        </div>`
    }
}

async function setPlaylistCards() {
    Array.from(playlistListDiv.querySelectorAll(".playlist-card")).forEach(el => {
        const btn = el.querySelector(".pt-top img.play-btn");
        const widthForHoverEffect = 1000

        el.addEventListener("mouseenter", () => {
            if (btn && window.innerWidth > widthForHoverEffect) btn.classList.add("active");
        });

        el.addEventListener("mouseleave", () => {
            if (btn && window.innerWidth > widthForHoverEffect) btn.classList.remove("active");
        });

        el.addEventListener('click', (event) => {
            event.preventDefault();
            el.dataset.playlistSelected = "true"
            currentPlaylistId = el.dataset.playlistId;
            displaySongCards();
            setListenersOnSongCards();
            let forCheck = false;
            for (const e of songsListDiv.querySelectorAll(".song-card")) {
                if (currentSong && e.dataset.songName === playbarSongName.textContent) {
                    toggleSongPlaying(Number(e.dataset.songId), true);
                    forCheck = true;
                }
            }
            if (!forCheck) currentSongId = null;
            if (windowWidth <= 500) {
                document.querySelector(".bottom .left").style.display = 'flex';
                document.querySelector(".bottom .right").style.display = 'none';
            }
            document.getElementById('back-to-playlist').addEventListener('click', () => {
                document.querySelector(".bottom .left").style.display = 'none';
                document.querySelector(".bottom .right").style.display = 'flex';
            })
        })
    });
}


/* -------------------- SONGS -------------------- */
function displaySongCards() {
    songsListDiv.innerHTML = '';
    let songs = [];
    if (!currentPlaylistId) {
        for (const [songId, songData] of Object.entries(songsLinks)) {
            songs.push(getSongAndArtistName(songData.url))
        }
    }
    else {
        for (const songId of Object.values(songsByPlaylist)[currentPlaylistId].songs) {
            songs.push(getSongAndArtistName(songsLinks[songId].url))
        }
    }
    if (songs.length > 0) {
        for (const [index, song] of songs.entries()) {
            songsListDiv.innerHTML = songsListDiv.innerHTML + `<div class="song-card br-0p5-rem" data-song-id = ${index} data-song-playing ="false" data-song-name = "${song[0]}">
                            <span class="flex ai-center pos-r">
                                <img class="invert" src="/images/music.svg" alt="">
                                <div class="song-info flex-1 flex fd-col jc-sp ai-start of-hidden">
                                    <p class="song-name of-hidden">${song[0]}</p>
                                    <p class="artist-name of-hidden">${(song[1])}</p>
                                    </div>
                                    <p class="popover flex pos-a bg-gray clr-white br-0p5-rem of-hidden">${song[0]}<br>${song[1]}</p>
                                <button class="play-button flex jc-sb ai-center bg-none bd-none clr-white of-hidden cursor-pointer"><span>Play now</span><img class="play-btn" src=${getPlayPauseSVGs('play')} alt=""></button>
                            </span>
                        </div>`
        }
    }
    if (!document.querySelector('.left-footer')) {
        const elementIs = (windowWidth <= 500) ? songsListDiv : songsListDiv.parentElement;
        elementIs.insertAdjacentHTML("beforeend", `<div class="left-footer flex clr-gray">
                            <div><a class="clr-gray" href="https://www.spotify.com/pk-en/legal/">Legal</a></div>
                            <div><a class="clr-gray" href="https://www.spotify.com/pk-en/safetyandprivacy/">Safety &
                                    Privacy
                                    Center</a></div>
                            <div><a class="clr-gray" href="https://www.spotify.com/pk-en/legal/privacy-policy/">Privacy
                                    Policy</a></div>
                            <div><a class="clr-gray"
                                    href="https://www.spotify.com/pk-en/legal/cookies-policy/">Cookies</a>
                            </div>
                            <div><a class="clr-gray" href="https://www.spotify.com/pk-en/legal/privacy-policy/#s3">About
                                    Ads</a>
                            </div>
                            <div><a class="clr-gray"
                                    href="https://www.spotify.com/pk-en/accessibility/">Accessibility</a>
                            </div>
                        </div>`);
    }
}

function setCurrentSong(songId, songCard) {
    if (songCard.dataset.songPlaying === "false" && currentSongId === songId && currentSong) {
        currentSong.pause();
        return;
    }
    if (songCard.dataset.songPlaying === "true" && currentSongId === songId && currentSong) {
        currentSong.play();
        return;
    }
    if (songCard.dataset.songPlaying === "true" && currentSongId !== songId && currentSong) {
        currentSong.pause();
        currentSong.currentTime = 0;
        initSeekbar("remove");
        seekbarBall.style.left = "0";
    }
    currentSongId = songId;
    currentSong = new Audio();
    currentSongUrl = currentPlaylistId ? songsLinks[Object.values(songsByPlaylist)[currentPlaylistId].songs[songId]].url : songsLinks[Object.keys(songsLinks)[songId]].url
    currentSong.src = currentSongUrl.replace('dl=0', 'dl=1')
    currentSong.preload = "auto";
    currentSong.load();
    playbarSongName.textContent = getSongAndArtistName(currentSongUrl)[0]
    playbarArtistName.textContent = getSongAndArtistName(currentSongUrl)[1]
    currentSong.addEventListener('timeupdate', () => {
        if (!currentSong) return;
        if (!isDragging) seekbarBall.style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;
        playbarSongDuration.textContent = `${formatTime(currentSong.currentTime)} : ${formatTime(currentSong.duration)}`;
    });
    currentSong.addEventListener('ended', () => {
        if (!currentSong) return;
        currentSong.currentTime = 0;
        currentSong.pause();
        seekbarBall.style.left = "0";
    });
    currentSong.play();
    initSeekbar("apply");
}

function toggleSongPlaying(songId, songsListChanged = false) {
    const clickedSongCard = document.querySelector(`[data-song-id="${songId}"]`)
    if (!clickedSongCard) return;

    togglePlaybar();
    if (!songsListChanged) {
        if (clickedSongCard.dataset.songPlaying === "false") {
            for (const sibling of songsListDiv.querySelectorAll(".song-card")) {
                sibling.firstElementChild.lastElementChild.querySelector('img').src = getPlayPauseSVGs('play');
                sibling.dataset.songPlaying = "false";
                sibling.classList.remove('selected');
            }
            clickedSongCard.classList.add('selected');
            clickedSongCard.dataset.songPlaying = "true";
            clickedSongCard.firstElementChild.lastElementChild.querySelector('img').src = getPlayPauseSVGs('pause');
            mainPlayButton.src = getPlayPauseSVGs('pause', true);
        }
        else {
            clickedSongCard.dataset.songPlaying = "false";
            clickedSongCard.firstElementChild.lastElementChild.querySelector('img').src = getPlayPauseSVGs('play');
            mainPlayButton.src = getPlayPauseSVGs('play', true);
        }
        setCurrentSong(songId, clickedSongCard);
    }
    else {
        clickedSongCard.dataset.songPlaying = "true";
        clickedSongCard.classList.add('selected');
        clickedSongCard.firstElementChild.lastElementChild.querySelector('img').src = getPlayPauseSVGs('pause');
        currentSongId = songId;
    }
}

function setListenersOnSongCards() {
    for (const e of songsListDiv.querySelectorAll(".song-card")) {
        e.firstElementChild.lastElementChild.addEventListener('click', () => {
            toggleSongPlaying(Number(e.dataset.songId));
        });
    }
}


/* -------------------- INITIALIZERS (SEEKBAR, HAMBURGER, MENU LIST) -------------------- */
function initSeekbar(action = "apply") {
    const parent = seekbarBall.parentElement;

    const clickHandler = (event) => {
        if (event.target === seekbarBall) return;
        const percent = (event.offsetX / parent.clientWidth) * 100;
        seekbarBall.style.left = `${percent}%`;
        if (currentSong) currentSong.currentTime = (percent / 100) * currentSong.duration;
    };

    const mousedownHandler = (e) => {
        e.preventDefault();
        isDragging = true;
        offsetXPercent = ((e.clientX - seekbarBall.offsetLeft) / parent.clientWidth) * 100;
        seekbarBall.style.cursor = "grabbing";
    };

    const mousemoveHandler = (e) => {
        if (!isDragging) return;
        xPercent = ((e.clientX - parent.getBoundingClientRect().left) / parent.clientWidth) * 100;
        xPercent -= (offsetXPercent / parent.clientWidth) * 100;
        xPercent = Math.max(0, Math.min(xPercent, 100));
        seekbarBall.style.left = `${xPercent}%`;
    };

    const mouseupHandler = () => {
        if (!isDragging) return;
        isDragging = false;
        seekbarBall.style.cursor = "grab";
        if (currentSong) {
            const finalPercent = parseFloat(seekbarBall.style.left) / 100;
            currentSong.currentTime = finalPercent * currentSong.duration;
        }
    };

    if (action === "apply") {
        parent.addEventListener('click', clickHandler);
        seekbarBall.addEventListener('mousedown', mousedownHandler);
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
    } else if (action === "remove") {
        parent.removeEventListener('click', clickHandler);
        seekbarBall.removeEventListener('mousedown', mousedownHandler);
        document.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
    }
}

function initHamburger() {
    const btn = document.getElementById('toggleMenu');
    const menuList = document.querySelector('.menu-list');
    btn.addEventListener('click', () => {
        const active = btn.classList.toggle('active');
        btn.setAttribute('aria-expanded', String(active));
        btn.setAttribute('aria-label', active ? 'Close menu' : 'Open menu');
        menuList.classList.toggle('open', active);
    });
}

function initMenuList() {
    const btnLinks = ['https://www.spotify.com/login/', 'https://www.spotify.com/signup/', 'https://www.spotify.com/premium/', 'https://www.spotify.com/support/', 'https://www.spotify.com/download/', 'https://www.spotify.com/pk-en/legal/privacy-policy/', 'https://www.spotify.com/pk-en/legal/end-user-agreement/']
    document.querySelectorAll('.menu-list button').forEach((el, index) => {
        el.addEventListener('click', () => {
            if (index > 2) window.open(btnLinks[index], "_blank", "noopener,noreferrer");
            else window.location.href = btnLinks[index];
        });
    });
}

/* -------------------- MAIN -------------------- */
async function main() {
    await getPlaylistCards();
    await setPlaylistCards();
    displaySongCards();
    setListenersOnSongCards();
    initHamburger();
    initMenuList();


    mainPlayButton.addEventListener('click', () => {
        if (currentSongId == null) toggleSongPlaying(songsListDiv.querySelectorAll(".song-card")[0].dataset.songId)
        else toggleSongPlaying(currentSongId)
    })
    previousButton.addEventListener('click', () => {
        if (currentSongId !== null && (currentSongId > 0 && currentSongId <= songsListDiv.querySelectorAll(".song-card").length - 1)) toggleSongPlaying(Number(currentSongId) - 1)
        else if (currentSongId == 0) toggleSongPlaying(songsListDiv.querySelectorAll(".song-card").length - 1)
    })
    nextButton.addEventListener('click', () => {
        if (currentSongId !== null && (currentSongId >= 0 && currentSongId < songsListDiv.querySelectorAll(".song-card").length - 1)) toggleSongPlaying(Number(currentSongId) + 1)
        else if (currentSongId == songsListDiv.querySelectorAll(".song-card").length - 1) toggleSongPlaying(0)
    })
    document.addEventListener("keydown", (event) => {
        switch (event.code) {
            case "KeyJ":
                previousButton.click();
                break;
            case "KeyK":
            case "Space":
                event.preventDefault();
                mainPlayButton.click();
                break;
            case "KeyL":
                nextButton.click();
                break;
        }
    });


    window.addEventListener("resize", () => {
        windowWidth = window.innerWidth;
    });
}

main()

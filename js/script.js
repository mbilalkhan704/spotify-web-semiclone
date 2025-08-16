const songsListDiv = document.querySelector(".songs-list");
const mainUrl = "http://127.0.0.1:5500";
const songsUrl = mainUrl + "/songs";
const playSvgUrl = "images/play.svg";
const pauseSvgUrl = "images/pause.svg";
const seekbarBall = document.querySelector('.seekbar-ball');
const playbarSongName = document.querySelector(".bottom .right .playbar .upper-pb .song-info .song-name")
const playbarArtistName = document.querySelector(".bottom .right .playbar .upper-pb .song-info .artist-name")
const playbarSongDuration = document.querySelector(".bottom .right .playbar .upper-pb .song-duration p")
const mainPlayButton = document.querySelector('.main-play-button');
const previousButton = document.querySelector('.previous-button');
const nextButton = document.querySelector('.next-button');

let isDragging = false;
let offsetXPercent = 0;
let xPercent = 0;
let currentSong = null
let currentSongId = null
let currentPlaylist = "sufi"

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(secs).padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
}

const getSongs = async (url) => {
    const html = await fetch(url)
    const response = await html.text()
    let div = document.createElement("div")
    div.innerHTML = response
    let anchors = div.getElementsByTagName("a")
    let songs = []
    for (const anchor of anchors) {
        let x = anchor.getElementsByTagName('span')[0]
        if (x && x.innerHTML.endsWith(".mp3")) songs.push(x.innerHTML)
    }
    return songs
}

async function displaySongCards(playlist) {
    songsListDiv.innerHTML = '';
    let songs = await getSongs(`${songsUrl}/${playlist}/`)
    for (const [index, song] of songs.entries()) {
        songsListDiv.innerHTML = songsListDiv.innerHTML + `<div class="song-card br-0p5-rem" data-song-id = ${index} data-song-playing = false>
                            <span class="flex ai-center">
                                <img class="invert" src="images/music.svg" alt="">
                                <div class="song-info flex-1 flex fd-col jc-sp ai-start of-hidden">
                                    <p class="song-name of-hidden">${song.split(' - ')[0]}</p>
                                    <p class="artist-name of-hidden">${(song.split(' - ')[1]).replace('.mp3', '')}</p>
                                </div>
                                <button class="play-button flex jc-sb ai-center bg-none bd-none clr-white of-hidden cursor-pointer"><span>Play now</span><img class="invert" src=${playSvgUrl} alt=""></button>
                            </span>
                        </div>`
    }
}

function setCurrentSong(songId) {
    const currentSongCard = document.querySelector(`[data-song-id="${songId}"]`);
    if (!currentSongCard) return;

    if (currentSongCard.dataset.songPlaying === "true") {

        // if same song resumed and played continue from where it was left
        if (currentSong && currentSongId === songId) {
            currentSongCard.classList.add('selected');
            currentSongCard.firstElementChild.lastElementChild.querySelector('img').src = pauseSvgUrl;
            currentSong.play();
            return;
        }

        // Stop previous song if it is different
        if (currentSong && currentSongId !== songId) {
            currentSong.pause();
            currentSong.currentTime = 0;
        }

        // Assign new song to the global variable and perform routine operations
        currentSongCard.classList.add('selected');
        currentSongCard.firstElementChild.lastElementChild.querySelector('img').src = pauseSvgUrl;

        let songInfo = currentSongCard.firstElementChild.children[1].children;
        playbarSongName.textContent = songInfo[0].textContent
        playbarArtistName.textContent = songInfo[1].textContent
        let songName = `${songInfo[0].textContent} - ${songInfo[1].textContent}.mp3`;

        currentSong = new Audio(`songs/${currentPlaylist}/` + encodeURIComponent(songName));
        currentSong.addEventListener('timeupdate', () => {
            if (isDragging) return;

            seekbarBall.style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;
            playbarSongDuration.textContent = `${formatTime(currentSong.currentTime)} : ${formatTime(currentSong.duration)}`;
        });

        currentSong.play();
        currentSongId = songId;

    } else {
        currentSongCard.firstElementChild.lastElementChild.querySelector('img').src = playSvgUrl;
        if (currentSongId === songId && currentSong) currentSong.pause();
        if (currentSongId !== songId && !currentSong) currentSongCard.classList.remove('selected');
    }
}

function toggleSongPlaying(songId) {
    const clickedSongCard = document.querySelector(`[data-song-id="${songId}"]`);
    if (!clickedSongCard) return;

    if (clickedSongCard.dataset.songPlaying === "true") {
        clickedSongCard.dataset.songPlaying = "false";
        mainPlayButton.src = playSvgUrl;
    } else {
        for (const sibling of songsListDiv.children) {
            sibling.firstElementChild.lastElementChild.querySelector('img').src = playSvgUrl;
            sibling.dataset.songPlaying = "false";
            sibling.classList.remove('selected');
        }
        clickedSongCard.dataset.songPlaying = "true";
        mainPlayButton.src = pauseSvgUrl;
    }
    setCurrentSong(songId);
}

async function getPlaylistCards(){
    plCards = await fetch("")
    return plCards
}

// function setPlaylistCards(playlistCards){
//     playlistCards.array.forEach(element => {
//         element.addEventListener('click', () =>{
//             currentPlaylist = playlistCards.dataset.playlistName;
//         })
//     });
// }

async function main() {
    // const playlistCards = getPlaylistCards;
    // setPlaylistCards(playlistCards);
    await displaySongCards(currentPlaylist)

    // Attach event listeners
    for (const e of songsListDiv.children) {
        e.firstElementChild.lastElementChild.addEventListener('click', () => {
            toggleSongPlaying(e.dataset.songId);
        });
    }
    mainPlayButton.addEventListener('click', () => {
        if (!currentSongId) toggleSongPlaying(songsListDiv.children[0].dataset.songId)
        else toggleSongPlaying(currentSongId)
    })
    previousButton.addEventListener('click', () => {
        if (currentSongId !== null && (currentSongId > 0 && currentSongId <= songsListDiv.children.length - 1)) toggleSongPlaying(Number(currentSongId) - 1)
        else if (currentSongId == 0) toggleSongPlaying(songsListDiv.children.length - 1)
        else;
    })
    nextButton.addEventListener('click', () => {
        if (currentSongId !== null && (currentSongId >= 0 && currentSongId < songsListDiv.children.length - 1)) toggleSongPlaying(Number(currentSongId) + 1)
        else if (currentSongId == songsListDiv.children.length - 1) toggleSongPlaying(0)
        else;
    })

    seekbarBall.parentElement.addEventListener('click', (event) => {
        if (event.target === seekbarBall) return;

        const percent = (event.offsetX / seekbarBall.parentElement.clientWidth) * 100;
        seekbarBall.style.left = `${percent}%`;
        xPercent = percent;

        if (currentSong) {
            currentSong.currentTime = (percent / 100) * currentSong.duration;
        }
    });

    seekbarBall.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        offsetXPercent = ((e.clientX - seekbarBall.offsetLeft) / seekbarBall.parentElement.clientWidth) * 100;
        seekbarBall.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const parent = seekbarBall.parentElement;
        xPercent = ((e.clientX - parent.getBoundingClientRect().left) / parent.clientWidth) * 100;
        xPercent -= (offsetXPercent / parent.clientWidth) * 100;
        xPercent = Math.max(0, Math.min(xPercent, 100));
        seekbarBall.style.left = `${xPercent}%`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        seekbarBall.style.cursor = "grab";
        if (currentSong) {
            const finalPercent = parseFloat(seekbarBall.style.left) / 100;
            currentSong.currentTime = finalPercent * currentSong.duration;
        }
    });
}

main()
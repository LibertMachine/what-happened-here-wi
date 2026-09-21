console.log("What Happened Here JS loaded!");

const map = L.map("map").setView([44.5, -89.5], 7);

L.tileLayer(
  "https://tiles.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 20,
    attribution:
      '&copy; OpenStreetMap contributors &copy; CARTO'
  }
).addTo(map);

let events = [];

const eventMarkers = [];

async function loadEvents() {
  try {
    const response = await fetch(
  `data/events.json?v=${Date.now()}`
);

    if (!response.ok) {
      throw new Error(
        `Could not load events.json: ${response.status}`
      );
    }

    events = await response.json();

    const locationGroups = new Map();

events.forEach((event) => {
  const locationKey = `${event.lat},${event.lng}`;

  if (!locationGroups.has(locationKey)) {
    locationGroups.set(locationKey, []);
  }

  locationGroups.get(locationKey).push(event);
});

locationGroups.forEach((storiesHere) => {
  const firstStory = storiesHere[0];

  const markerType =
  firstStory.markerType || "history";

const storyIcon = L.divIcon({
  className: "story-marker-wrapper",
  html: `
    <div class="story-marker story-marker-${markerType}">
      <span class="story-marker-question">?</span>
    </div>
  `,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -34]
});
  
  const marker = L.marker(
    [
      firstStory.lat,
      firstStory.lng
    ],
    {
      icon: storyIcon
    }
  );

  if (storiesHere.length > 1) {
    marker.bindPopup("");
  
    marker.on("popupopen", () => {
      const visibleStories = storiesHere.filter(
        (story) => story.isVisible !== false
      );
  
      marker.setPopupContent(`
        <div class="multi-story-popup">
  
          <p class="multi-story-eyebrow">
            ${visibleStories.length} ${
              visibleStories.length === 1
                ? "STORY"
                : "STORIES"
            } HAPPENED HERE
          </p>
  
          <div class="multi-story-list">
            ${visibleStories
              .map(
                (story) => `
                  <button
                    class="story-popup-link"
                    data-story-title="${story.title}"
                  >
                    <span class="popup-story-year">
                      ${story.year}
                    </span>
  
                    <span class="popup-story-title">
                      ${story.title}
                    </span>
  
                    <span class="popup-story-arrow">
                      →
                    </span>
                  </button>
                `
              )
              .join("")}
          </div>
  
          <p class="multi-story-hint">
            ${
              visibleStories.length === 1
                ? "Explore this story"
                : "Choose a story to explore"
            }
          </p>
  
        </div>
      `);
  
      document
        .querySelectorAll(".story-popup-link")
        .forEach((button) => {
          button.addEventListener("click", () => {
            const selectedStory =
              visibleStories.find(
                (story) =>
                  story.title ===
                  button.dataset.storyTitle
              );
  
            if (selectedStory) {
              showStory(selectedStory);
              map.closePopup();
            }
          });
        });
    });
  } else {
    marker.bindPopup(`
      <strong>${firstStory.title}</strong><br>
      ${firstStory.year}
    `);
  
    marker.on("click", () => {
      showStory(firstStory);
    });
  }

  storiesHere.forEach((story) => {
    story.marker = marker;
  });

  eventMarkers.push(marker);

  marker.addTo(map);
});

    console.log(
  `${events.length} historical events loaded`
);

updateVisibleEvents();
  } catch (error) {
    console.error(
      "Error loading historical events:",
      error
    );
  }
}

loadEvents();

function showStory(event) {
  const storyCard = document.getElementById("storyCard");

  document.getElementById("storyCategory").textContent =
    event.category;

  document.getElementById("storyTitle").textContent =
    event.title;

  document.getElementById("storyYear").textContent =
    event.year;

  document.getElementById("storyLocation").textContent =
  event.location || "";

  const storyImageWrap =
  document.getElementById("storyImageWrap");

const storyImage =
  document.getElementById("storyImage");

const storyImageCredit =
  document.getElementById("storyImageCredit");

if (event.image) {
  storyImage.src = event.image;
  storyImage.alt =
    event.imageAlt || event.title;

  storyImageCredit.textContent =
    event.imageCredit
      ? `Photo: ${event.imageCredit}`
      : "";

  storyImageWrap.classList.remove("hidden");
} else {
  storyImage.src = "";
  storyImage.alt = "";
  storyImageCredit.textContent = "";

  storyImageWrap.classList.add("hidden");
}
  
  document.getElementById(
  "storyDistance"
).textContent =
  event.distance !== undefined
    ? `${event.distance.toFixed(1)} miles away`
    : "";

  document.getElementById("storySummary").textContent =
    event.summary;

  document.getElementById("storySource").textContent =
    event.source;

    const sourceLink =
  document.getElementById("storySourceLink");

if (event.sourceUrl) {
  sourceLink.href = event.sourceUrl;
  sourceLink.style.display = "inline-block";
} else {
  sourceLink.style.display = "none";
}

  storyCard.classList.remove("hidden");
}

document
  .getElementById("surpriseBtn")
  .addEventListener("click", () => {
    const visibleEvents = events.filter(
      (event) => event.isVisible
    );

    if (visibleEvents.length === 0) {
      alert(
        "No stories match your current filters. Try a larger radius or another category."
      );
      return;
    }

    const randomEvent =
      visibleEvents[
        Math.floor(Math.random() * visibleEvents.length)
      ];

    map.flyTo(
      [randomEvent.lat, randomEvent.lng],
      14,
      { duration: 1.5 }
    );

    showStory(randomEvent);
  });

  const locationBtn = document.getElementById("locationBtn");

let userMarker = null;
let radiusCircle = null;

let userLat = null;
let userLng = null;

locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser.");
    return;
  }

  locationBtn.textContent = "Finding You...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;

      updateClosestStory();

      document
  .querySelectorAll(
    '.radius-btn:not([data-radius="all"])'
  )
  .forEach((button) => {
    button.disabled = false;
  });

const locationHint =
  document.getElementById("locationHint");

locationHint.textContent =
  "Location enabled — choose how far you want to explore.";

      map.flyTo([userLat, userLng], 13, {
        duration: 1.5
      });

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker = L.circleMarker(
        [userLat, userLng],
        {
          radius: 8,
          weight: 3,
          fillOpacity: 1
        }
      ).addTo(map);

      userMarker.bindPopup("You are here").openPopup();

      locationBtn.textContent = "Location Found";

updateVisibleEvents();
    },

    (error) => {
  console.error("Geolocation error:", error);

  locationBtn.textContent = "Use My Location";

  let message = "We couldn't get your location.";

  if (error.code === 1) {
    message = "Location permission was denied.";
  }

  if (error.code === 2) {
    message = "Your location could not be determined.";
  }

  if (error.code === 3) {
    message = "Location request timed out.";
  }

  alert(`${message}\n\nError: ${error.message}`);
},

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

let selectedRadius = "all";

let selectedCategory = "All";

let selectedMarkerType = "All";




const storyCloseBtn =
  document.getElementById("storyCloseBtn");

storyCloseBtn.addEventListener("click", () => {
  document
    .getElementById("storyCard")
    .classList.add("hidden");
});

const radiusButtons =
  document.querySelectorAll(".radius-btn");

radiusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    radiusButtons.forEach((btn) =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    const radius =
      button.dataset.radius;

    selectedRadius =
  radius === "all"
    ? "all"
    : Number(radius);

updateVisibleEvents();
updateClosestStory();
updateRadiusCircle();

if (
  radiusCircle &&
  selectedRadius !== "all"
) {
  map.fitBounds(
    radiusCircle.getBounds(),
    {
      padding: [30, 30],
      animate: true,
      duration: 0.8
    }
  );
} else if (selectedRadius === "all") {
  map.flyTo(
    [44.5, -89.5],
    7,
    {
      duration: 1.2
    }
  );
}
  });
});

const categoryButtons =
  document.querySelectorAll(".category-btn");

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedCategory =
      button.dataset.category;

    updateVisibleEvents();
  });
});

const storyTypeButtons =
  document.querySelectorAll(".story-type-btn");

storyTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    storyTypeButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedMarkerType =
      button.dataset.markerType;

    updateVisibleEvents();
  });
});



function milesBetween(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;

  const toRadians = (degrees) =>
    degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusMiles * c;
}

function updateRadiusCircle() {
  if (radiusCircle) {
    map.removeLayer(radiusCircle);
    radiusCircle = null;
  }

  if (
    userLat === null ||
    userLng === null ||
    selectedRadius === "all"
  ) {
    return;
  }

  // Leaflet expects radius in meters.
  const radiusInMeters =
    selectedRadius * 1609.344;

  radiusCircle = L.circle(
    [userLat, userLng],
    {
      radius: radiusInMeters,
      weight: 2,
      opacity: 0.65,
      fillOpacity: 0.08,
      interactive: false
    }
  ).addTo(map);
}

function updateClosestStory() {
  if (
    userLat === null ||
    userLng === null ||
    events.length === 0
  ) {
    return;
  }

  let closestEvent = null;
  let closestDistance = Infinity;

  events.forEach((event) => {
    const distance = milesBetween(
      userLat,
      userLng,
      event.lat,
      event.lng
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestEvent = event;
    }
  });

  if (!closestEvent) {
    return;
  }

  const closestStory =
    document.getElementById("closestStory");

  const closestTitle =
    document.getElementById("closestTitle");

  const closestDistanceText =
    document.getElementById("closestDistance");

  closestTitle.textContent =
    closestEvent.title;

  closestDistanceText.textContent =
    `${closestDistance.toFixed(1)} miles away`;

  closestStory.classList.remove("hidden");

  const closestStoryBtn =
    document.getElementById("closestStoryBtn");

  closestStoryBtn.onclick = () => {
    map.flyTo(
      [closestEvent.lat, closestEvent.lng],
      15,
      { duration: 1.5 }
    );

    showStory(closestEvent);
  };
}

function updateVisibleEvents() {
  let visibleCount = 0;

  // First decide which individual stories
  // match the current filters.
  events.forEach((event) => {
    let withinRadius = true;

    if (
      userLat !== null &&
      userLng !== null
    ) {
      const distance = milesBetween(
        userLat,
        userLng,
        event.lat,
        event.lng
      );

      event.distance = distance;

      if (selectedRadius !== "all") {
        withinRadius =
          distance <= selectedRadius;
      }
    }

    const matchesCategory =
  selectedCategory === "All" ||
  event.category === selectedCategory;

    const eventMarkerType =
  event.markerType || "history";

    const matchesMarkerType =
  selectedMarkerType === "All" ||
  eventMarkerType === selectedMarkerType;

event.isVisible =
  withinRadius &&
  matchesCategory &&
  matchesMarkerType;

    if (event.isVisible) {
      visibleCount++;
    }
  });

  // Then decide which physical markers
  // should appear on the map.
  eventMarkers.forEach((marker) => {
    const storiesForMarker = events.filter(
      (event) => event.marker === marker
    );

    const markerShouldShow =
      storiesForMarker.some(
        (event) => event.isVisible
      );

    if (markerShouldShow) {
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  });

  const storyCount =
    document.getElementById("storyCount");

  if (userLat !== null && userLng !== null) {
    if (selectedRadius === "all") {
      storyCount.textContent =
        `${visibleCount} ${
          visibleCount === 1 ? "story" : "stories"
        } across Wisconsin`;
    } else {
      storyCount.textContent =
        `${visibleCount} ${
          visibleCount === 1 ? "story" : "stories"
        } within ${selectedRadius} ${
          selectedRadius === 1 ? "mile" : "miles"
        }`;
    }
  } else {
    storyCount.textContent =
      `${visibleCount} ${
        visibleCount === 1 ? "story" : "stories"
      } to explore across Wisconsin`;
  }
}

const exploreBtn =
  document.getElementById("exploreBtn");

if (exploreBtn) {
  exploreBtn.addEventListener("click", () => {

    // Find only stories currently allowed
    // by the active filters.
    const visibleEvents =
      events.filter(
        (event) =>
          event.isVisible &&
          event.marker &&
          map.hasLayer(event.marker)
      );

    if (visibleEvents.length === 0) {
      return;
    }

    // Pick a random visible story.
    const randomEvent =
      visibleEvents[
        Math.floor(
          Math.random() * visibleEvents.length
        )
      ];

    const targetMarker =
      randomEvent.marker;

    // Fly to the story location.
    map.flyTo(
      [
        randomEvent.lat,
        randomEvent.lng
      ],
      11,
      {
        animate: true,
        duration: 1.4
      }
    );

    // Open the marker after arriving.
    map.once("moveend", () => {
      targetMarker.openPopup();
    });

  });
}
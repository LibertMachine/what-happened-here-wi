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
    const response = await fetch("data/events.json");

    if (!response.ok) {
      throw new Error(
        `Could not load events.json: ${response.status}`
      );
    }

    events = await response.json();

    events.forEach((event) => {
      const marker = L.marker([
        event.lat,
        event.lng
      ]);

      marker.bindPopup(`
        <strong>${event.title}</strong><br>
        ${event.year}
      `);

      marker.on("click", () => {
        showStory(event);
      });

      event.marker = marker;

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
    if (events.length === 0) {
      return;
    }

    const randomEvent =
      events[Math.floor(Math.random() * events.length)];

    map.flyTo(
      [randomEvent.lat, randomEvent.lng],
      14,
      { duration: 1.5 }
    );

    showStory(randomEvent);
  });

  const locationBtn = document.getElementById("locationBtn");

let userMarker = null;
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

let selectedRadius = 1;

let selectedCategory = "All";

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

function updateVisibleEvents() {
  events.forEach((event) => {
    let withinRadius = true;

    if (userLat !== null && userLng !== null) {
      const distance = milesBetween(
        userLat,
        userLng,
        event.lat,
        event.lng
      );

      event.distance = distance;

      withinRadius =
        distance <= selectedRadius;
    }

    const matchesCategory =
      selectedCategory === "All" ||
      event.category === selectedCategory;

    const shouldShow =
      withinRadius && matchesCategory;

    if (shouldShow) {
      if (!map.hasLayer(event.marker)) {
        event.marker.addTo(map);
      }
    } else {
      if (map.hasLayer(event.marker)) {
        map.removeLayer(event.marker);
      }
    }
  });
}

const categoryButtons =
  document.querySelectorAll(".category-btn");

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    selectedCategory =
      button.dataset.category;

    updateVisibleEvents();
  });
});
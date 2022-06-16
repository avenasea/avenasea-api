export const getGpsFromAddress = async (addr) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        addr
      )}&format=json&polygon=1&addressdetails=1`
    );

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("addr lookup failed: ", err);
  }
};

export const getAddressFromGps = async (coords) => {
  const [lat, lon] = coords;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse.php?lat=${lat}&lon=${lon}&zoom=18&format=jsonv2`
    );

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("GPS lookup failed", err);
  }
};

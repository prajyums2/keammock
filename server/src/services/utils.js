export function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function errorResponse(res, message = 'Server error', statusCode = 500, errors = null) {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

export function paginate(query, Model, { page = 1, limit = 50, sort = { createdAt: -1 } }) {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return Model.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));
}

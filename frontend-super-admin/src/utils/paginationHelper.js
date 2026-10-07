/**
 * Universal pagination helper to normalize Spring Page<T>, PagedResponse<T>,
 * plain arrays, and empty responses into a consistent pagination object.
 */
export function extractPageData(response, requestedPage = 0, requestedSize = 20) {
  if (!response) {
    const emptyResult = {
      content: [],
      page: requestedPage,
      size: requestedSize,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true
    };
    return {
      ...emptyResult,
      data: emptyResult.content,
      meta: { ...emptyResult }
    };
  }

  // Case 1: Plain Array fallback
  if (Array.isArray(response)) {
    const totalElements = response.length;
    const totalPages = Math.ceil(totalElements / requestedSize) || 1;
    const arrayResult = {
      content: response,
      page: requestedPage,
      size: requestedSize,
      totalElements,
      totalPages,
      first: requestedPage === 0,
      last: requestedPage >= totalPages - 1
    };
    return {
      ...arrayResult,
      data: arrayResult.content,
      meta: { ...arrayResult }
    };
  }

  // Case 2: Spring Page<T> or PagedResponse<T>
  const content = Array.isArray(response.content) 
    ? response.content 
    : (Array.isArray(response.data) ? response.data : []);
  const page = typeof response.number === 'number'
    ? response.number
    : (typeof response.page === 'number' ? response.page : requestedPage);
  const size = typeof response.size === 'number' ? response.size : requestedSize;
  const totalElements = typeof response.totalElements === 'number'
    ? response.totalElements
    : (typeof response.total === 'number' ? response.total : content.length);
  const totalPages = typeof response.totalPages === 'number'
    ? response.totalPages
    : (Math.ceil(totalElements / size) || 1);
  const first = typeof response.first === 'boolean'
    ? response.first
    : page === 0;
  const last = typeof response.last === 'boolean'
    ? response.last
    : page >= totalPages - 1;

  const result = {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first,
    last
  };

  return {
    ...result,
    data: content,
    meta: { ...result }
  };
}

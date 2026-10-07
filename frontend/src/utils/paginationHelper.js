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

  // Case 2: Spring Page<T>, PagedModel<T> (VIA_DTO), or PagedResponse<T>
  const pageObj = (response.page && typeof response.page === 'object') ? response.page : null;
  const content = Array.isArray(response.content) 
    ? response.content 
    : (Array.isArray(response.data) ? response.data : []);
  const page = typeof response.number === 'number'
    ? response.number
    : (typeof response.page === 'number' ? response.page : (typeof pageObj?.number === 'number' ? pageObj.number : requestedPage));
  const size = typeof response.size === 'number' 
    ? response.size 
    : (typeof pageObj?.size === 'number' ? pageObj.size : requestedSize);
  const totalElements = typeof response.totalElements === 'number'
    ? response.totalElements
    : (typeof response.total === 'number' ? response.total : (typeof pageObj?.totalElements === 'number' ? pageObj.totalElements : content.length));
  const totalPages = typeof response.totalPages === 'number'
    ? response.totalPages
    : (typeof pageObj?.totalPages === 'number' ? pageObj.totalPages : (Math.ceil(totalElements / size) || 1));
  const first = typeof response.first === 'boolean'
    ? response.first
    : (typeof pageObj?.number === 'number' ? pageObj.number === 0 : page === 0);
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

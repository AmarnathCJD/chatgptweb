package handler

import (
	"fmt"
	"io"
	"net/http"
	furl "net/url"
)

func HiliteHandler(w http.ResponseWriter, r *http.Request) {
	// remove /api from urlpath
	url := "http://hilite.me/api?"
	params := r.URL.Query()
	for k, v := range params {
		url += k + "=" + furl.QueryEscape(v[0]) + "&"
	}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json, text/plain, */*")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(w, "Error: %s", err)
		return
	}
	io.Copy(w, resp.Body)
}

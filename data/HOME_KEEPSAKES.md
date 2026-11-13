# Home: letter box and photo album

Both objects are in `misc/my_life.html`. Click them, or walk close and press E.
Keyboard users can also tab to the two Home keepsake buttons. Dialogs stop the
character, trap focus, and return focus when closed. Shared links use
`#guestbook` and `#photos`. The official widget's `#guestbookComments` return
anchor and the GitHub OAuth callback also reopen the letter box automatically.

## Activate GitHub comments (one-time owner setup)

The letter box uses [giscus](https://giscus.app), with public comments stored in
`killthefullmoon/killthefullmoon.github.io` GitHub Discussions. Discussions is
enabled. There are no client secrets or tokens in the website.

1. Open <https://github.com/apps/giscus/installations/new> as the repository owner.
2. Choose **Only select repositories**, then **killthefullmoon.github.io**, and install.
3. Return to the open letter box; it reconnects when the tab regains focus.
   You can also press **Try again**. Visitors can then authorize
   giscus with their own GitHub accounts and leave comments or replies.

The public repository and Announcements category IDs in `home_keepsakes.js`
have been verified through GitHub. The official widget uses a fixed `specific` mapping term,
`Letters to Hui · Home guestbook`, with strict matching, so local previews,
production URLs, and hash changes share one thread. giscus creates that thread
when the first real visitor posts; no example comments are seeded.
Moderate or reply through GitHub Discussions. If the app isn't installed, a
clear pending message is shown; local previews include the owner installation
link and instructions. Network failures offer a retry.

Account sign-in and posting require the actual owner installation and a visitor
GitHub login. Do not substitute simulated login or browser-only message storage.

## Add photographs

The photo album reads `data/photo-album.json`; no game code changes are needed.
The first 13 images are existing photos from the Ohio and Zhejiang travel pages.
Original files are reused, with 720-pixel JPEG thumbnails in `images/thumbs/photos`.

Add an entry under `photos`:

```json
{
  "id": "unique-photo-id",
  "category": "scenery",
  "place": "Ann Arbor",
  "year": 2024,
  "title": "A descriptive title",
  "caption": "Optional caption",
  "alt": "A description of what is visible in the photograph",
  "src": "../images/photos/example.jpg",
  "thumbnail": "../images/thumbs/photos/example.jpg"
}
```

Paths resolve relative to the manifest file; match filename capitalization.
`category` is required: `people` (People), `scenery` (Scenery, including architecture,
interiors, and still-life scenes), `food` (Food), or `concerts` (Concerts).
The album opens in People and filters only by these four categories; there is
no All view. Each photograph shows its `place` and a small `year` tag side by
side. The full-size viewer also includes the year next to the location caption.
`year` is required: use a four-digit number confirmed by the photo's original
capture metadata or supplied by Hui. Use `null` for an unconfirmed year; it
appears as “—” with an accessible “Year not recorded” label. Never use a file's
copy, upload, or modification time as the year the photo was taken.
`thumbnail`, `title`, and `caption` are optional. The index paginates at 12 photos. Only the current page's
thumbnails load; originals load on opening a photo. Full photos use `contain`
without cropping. Left/right keys browse; Escape returns to the index, then
closes the album.

On macOS, a thumbnail can be made without changing its original:

```sh
sips -s format jpeg -s formatOptions 76 --resampleHeightWidthMax 720 \
  images/photos/example.jpg --out images/thumbs/photos/example.jpg
```

## Artwork

`images/home/keepsakes/mailbox.png` and `photo-album.png` were generated with
the built-in imagegen tool, using the existing furniture atlas as the style
reference. Both retain their original transparent alpha. The complete prompt
set is `images/home/keepsakes/prompts.json`.

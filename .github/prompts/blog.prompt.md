<html>
  <head>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="" />
    <link
      rel="stylesheet"
      as="style"
      onload="this.rel='stylesheet'"
      href="https://fonts.googleapis.com/css2?display=swap&amp;family=Newsreader%3Awght%40400%3B500%3B700%3B800&amp;family=Noto+Sans%3Awght%40400%3B500%3B700%3B900"
    />

    <title>Stitch Design</title>
    <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64," />

    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  </head>
  <body>
    <div class="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden" style='font-family: Newsreader, "Noto Sans", sans-serif;'>
      <div class="layout-container flex h-full grow flex-col">
        <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f5] px-10 py-3">
          <div class="flex items-center gap-4 text-[#111418]">
            <div class="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">TechBlog</h2>
          </div>
          <div class="flex flex-1 justify-end gap-8">
            <div class="flex items-center gap-9">
              <a class="text-[#111418] text-sm font-medium leading-normal" href="#">Home</a>
              <a class="text-[#111418] text-sm font-medium leading-normal" href="#">Articles</a>
              <a class="text-[#111418] text-sm font-medium leading-normal" href="#">About</a>
              <a class="text-[#111418] text-sm font-medium leading-normal" href="#">Contact</a>
            </div>
            <div class="flex gap-2">
              <button
                class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f0f2f5] text-[#111418] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5"
              >
                <div class="text-[#111418]" data-icon="MagnifyingGlass" data-size="20px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
                    ></path>
                  </svg>
                </div>
              </button>
              <button
                class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f0f2f5] text-[#111418] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5"
              >
                <div class="text-[#111418]" data-icon="Bookmark" data-size="20px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,16V161.57l-51.77-32.35a8,8,0,0,0-8.48,0L72,161.56V48ZM132.23,177.22a8,8,0,0,0-8.48,0L72,209.57V180.43l56-35,56,35v29.14Z"
                    ></path>
                  </svg>
                </div>
              </button>
              <button
                class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f0f2f5] text-[#111418] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5"
              >
                <div class="text-[#111418]" data-icon="Sun" data-size="20px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>
            <div
              class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgYQ2oCOURmQEDNPOPvRbDPkW7F8XTNLVy2RjPMv5OWwIg88SnHjdwWFrwYRbTwDrSu_LO4lwobLP4_5mkZlXcrkvvOxB5267hYZH_qGtRCoWx95MbFFZJZ6lvhwjl90kUH0xDb2_R0JOTHFlZtLvUtShiByP_74FiEdh2zmV31Ch5_Fr6x-y0KPtr1msX9uRkMZwJSIFZ5zJ5XOPDQyi0_z4PfWFMyKO-ucQDj16Zlb2OPliX7ZZk0AN1uA-sDosyFR5ggRC-4ahK");'
            ></div>
          </div>
        </header>
        <div class="gap-1 px-6 flex flex-1 justify-center py-5">
          <div class="layout-content-container flex flex-col w-80">
            <h3 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Past Articles</h3>
            <div class="flex items-center gap-4 bg-white px-4 min-h-14">
              <p class="text-[#111418] text-base font-normal leading-normal flex-1 truncate">The Rise of Quantum Computing</p>
            </div>
            <div class="flex items-center gap-4 bg-white px-4 min-h-14">
              <p class="text-[#111418] text-base font-normal leading-normal flex-1 truncate">Exploring the Metaverse</p>
            </div>
            <div class="flex items-center gap-4 bg-white px-4 min-h-14">
              <p class="text-[#111418] text-base font-normal leading-normal flex-1 truncate">Cybersecurity in the Digital Age</p>
            </div>
            <div class="flex items-center gap-4 bg-white px-4 min-h-14">
              <p class="text-[#111418] text-base font-normal leading-normal flex-1 truncate">The Impact of 5G Technology</p>
            </div>
            <div class="flex items-center gap-4 bg-white px-4 min-h-14">
              <p class="text-[#111418] text-base font-normal leading-normal flex-1 truncate">The Future of Cloud Computing</p>
            </div>
            <div class="px-4 py-3">
              <label class="flex flex-col min-w-40 h-12 w-full">
                <div class="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div
                    class="text-[#60758a] flex border-none bg-[#f0f2f5] items-center justify-center pl-4 rounded-l-lg border-r-0"
                    data-icon="MagnifyingGlass"
                    data-size="24px"
                    data-weight="regular"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                      <path
                        d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
                      ></path>
                    </svg>
                  </div>
                  <input
                    placeholder="Search articles"
                    class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#f0f2f5] focus:border-none h-full placeholder:text-[#60758a] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                    value=""
                  />
                </div>
              </label>
            </div>
            <h3 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Categories</h3>
            <div class="flex gap-3 p-3 flex-wrap pr-4">
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">AI</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">Cloud</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">Security</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">5G</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">Quantum</p>
              </div>
            </div>
          </div>
          <div class="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div class="flex flex-col gap-3 p-4">
              <div class="flex gap-6 justify-end"><p class="text-[#111418] text-sm font-normal leading-normal">20%</p></div>
              <div class="rounded bg-[#dbe0e6]"><div class="h-2 rounded bg-[#111418]" style="width: 20%;"></div></div>
            </div>
            <div class="flex flex-wrap gap-2 p-4">
              <a class="text-[#60758a] text-base font-medium leading-normal" href="#">Articles</a>
              <span class="text-[#60758a] text-base font-medium leading-normal">/</span>
              <span class="text-[#111418] text-base font-medium leading-normal">Technology</span>
            </div>
            <h2 class="text-[#111418] tracking-light text-[28px] font-bold leading-tight px-4 text-left pb-3 pt-5">
              The Future of Artificial Intelligence: Trends and Predictions
            </h2>
            <div class="p-4">
              <div class="flex items-stretch justify-between gap-4 rounded-lg">
                <div class="flex flex-col gap-1 flex-[2_2_0px]">
                  <p class="text-[#111418] text-base font-bold leading-tight">Sophia Carter</p>
                  <p class="text-[#60758a] text-sm font-normal leading-normal">Tech enthusiast exploring AI's impact on society.</p>
                </div>
                <div
                  class="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg flex-1"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0Nef5aHLxj_LVgHtgEsNfVzbsVt5_pfAoSPfiyM_U_kDQ2wE7EKN2FVdmyKSbrDDEp5N4-DrbMJpamNuFtBvCMpL5gVhjbbwKhEeyT9L3qnV1bLpRcOoB2j9n2qhoctiHZdQcl11WV4D2sXYV-eWTOLbn8YWWIrEJIvt5mN0sKM-YGpwP21RiV7alp2MkuZwCrqD-5lWw7vkJe8dHJPk-6edgUKqmoC50TEUmlGpVde0dVL0OkTpGQuzCrLQQK_CQiZPr0aH0aLkq");'
                ></div>
              </div>
            </div>
            <p class="text-[#60758a] text-sm font-normal leading-normal pb-3 pt-1 px-4">Published on January 15, 2024</p>
            <div class="flex w-full grow bg-white @container py-3">
              <div class="w-full gap-1 overflow-hidden bg-white @[480px]:gap-2 aspect-[3/2] flex">
                <div
                  class="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-none flex-1"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAgaCQrdcEf1lW9gqU5K8qsu5O55hVyybpxXLFc1cJL-RA-oqHu8EuJ4devMWQIge3t8riOjCewilaPqul2qL7PBEGLTtY-lONA7WFg_h4e-kevg5ynGBqiXGI492nxAUQ_V3jxdd2wD7CEy4Mr_4iHG7ZWi0sQprc-wISkkGZuqq2FyBqJbPewo27nNe2tXhhdrBo2mCR_hdyzZn81nDCjTMtHwIYPeWFtJa1q3fF3r_bzzzVIQge5tyXOQU0TyOtvbFdY3RC8tFqr");'
                ></div>
              </div>
            </div>
            <p class="text-[#111418] text-base font-normal leading-normal pb-3 pt-1 px-4">
              Artificial intelligence (AI) is rapidly transforming our world, and its impact is only expected to grow in the coming years. From self-driving cars to personalized
              medicine, AI is already revolutionizing various industries. In this article, we'll explore the key trends and predictions shaping the future of AI.
            </p>
            <div class="p-4">
              <div
                class="bg-cover bg-center flex flex-col items-stretch justify-end rounded-lg pt-[132px]"
                style='background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuAkbMb6Gc4N0DcIp88Dtc6EWRL4qnt8TGeRyP4xcquBSjpe9s8GO6BaLlK_QczedaAD-Fmr0ppL9Kxxdf2iA6i5qOq7oEMhF-WgHkQvYoSXU0eywT7L2WHhv7_P02gYnOqZzPij6ekV1WSQdb3T462JLTA_qfN15W6XEM_NrobpepzuTjqY-57I3DFnkWv_w1z0_GM8pkkOoVX7YDMVkw3PJHy6Iy8dtsi8BU9xWmgkkcn5O8Q2TspV12j0kNjEHbw8xNPc55bHldf7");'
              >
                <div class="flex w-full items-end justify-between gap-4 p-4">
                  <div class="flex max-w-[440px] flex-1 flex-col gap-1">
                    <p class="text-white tracking-light text-2xl font-bold leading-tight max-w-[440px]">Stay Updated with the Latest in Tech</p>
                    <p class="text-white text-base font-medium leading-normal">Subscribe to our newsletter for exclusive insights and updates.</p>
                  </div>
                  <button
                    class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0c7ff2] text-white text-sm font-bold leading-normal tracking-[0.015em]"
                  >
                    <span class="truncate">Subscribe</span>
                  </button>
                </div>
              </div>
            </div>
            <h3 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Key Trends in AI</h3>
            <p class="text-[#111418] text-base font-normal leading-normal pb-3 pt-1 px-4">
              Several key trends are driving the development and adoption of AI. These include advancements in machine learning, natural language processing, and computer vision.
              Additionally, the increasing availability of data and computing power is fueling AI innovation.
            </p>
            <div class="flex w-full grow bg-white @container py-3">
              <div class="w-full gap-1 overflow-hidden bg-white @[480px]:gap-2 aspect-[3/2] flex">
                <div
                  class="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-none flex-1"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuA04ERN0vThH9vTV9rm_JhGDFfMEZvFCAv6UxUZoYmgWm6EWZ73aou1sPqWz5Htq_V9fiDmoIbmxSmGAZp17Iz8byhH_Bn9BbpLSyxC3QRwNPzlnKL3IFifJYEWPDD25HMA_XOPuP0Y_Yp7fV3Etjse5KowHnG1JZXd309zLyB1s0MoiQKBvrsS7MiARRNJ-Qp3Pt60cTTVzD68qs3WsOTw6-VY1wPk2wLCs-70vdk9wqrGWrkprDiWDhgro5xhsCmQCzlZ4bBPGBiL");'
                ></div>
              </div>
            </div>
            <h3 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Predictions for the Future of AI</h3>
            <p class="text-[#111418] text-base font-normal leading-normal pb-3 pt-1 px-4">
              Experts predict that AI will continue to evolve and become more integrated into our daily lives. We can expect to see AI playing a more significant role in
              healthcare, education, and entertainment. Furthermore, AI is likely to drive advancements in robotics and automation.
            </p>
            <div class="flex gap-3 p-3 flex-wrap pr-4">
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">AI Trends</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">Future Tech</p>
              </div>
              <div class="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f5] pl-4 pr-4">
                <p class="text-[#111418] text-sm font-medium leading-normal">Innovation</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-4 px-4 py-2 py-2 justify-between">
              <div class="flex items-center justify-center gap-2 px-3 py-2">
                <div class="text-[#60758a]" data-icon="Heart" data-size="24px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,220.66,240,164,240,94A62.07,62.07,0,0,0,178,32ZM128,206.8C109.74,196.16,32,147.69,32,94A46.06,46.06,0,0,1,78,48c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,147.61,146.24,196.15,128,206.8Z"
                    ></path>
                  </svg>
                </div>
                <p class="text-[#60758a] text-[13px] font-bold leading-normal tracking-[0.015em]">125</p>
              </div>
              <div class="flex items-center justify-center gap-2 px-3 py-2">
                <div class="text-[#60758a]" data-icon="ChatCircleDots" data-size="24px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z"
                    ></path>
                  </svg>
                </div>
                <p class="text-[#60758a] text-[13px] font-bold leading-normal tracking-[0.015em]">42</p>
              </div>
              <div class="flex items-center justify-center gap-2 px-3 py-2">
                <div class="text-[#60758a]" data-icon="Bookmark" data-size="24px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,16V161.57l-51.77-32.35a8,8,0,0,0-8.48,0L72,161.56V48ZM132.23,177.22a8,8,0,0,0-8.48,0L72,209.57V180.43l56-35,56,35v29.14Z"
                    ></path>
                  </svg>
                </div>
                <p class="text-[#60758a] text-[13px] font-bold leading-normal tracking-[0.015em]">28</p>
              </div>
            </div>
            <h3 class="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Comments</h3>
            <div class="flex w-full flex-row items-start justify-start gap-3 p-4">
              <div
                class="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0"
                style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCZwbZ1wtONE0HosQZnUj8W37KxqQLvtFRpC7DsF4zwCHd5eelLmHmHo5vnLaQUAAvt34Slh7FTM403LHxd1YBKgKwwCnJsiVRK7011U6_hpjZrO7GAmmWGNpmuFmYEoVkiEtNfVRaT9VsDSqMcxBWvwgj_rmSP7gT67-OlGYzzZ8Dn92YzeJZyCOYkNYW8fDxKAxZ7qvpvIGr6R3g69ll62385ooCG4bxfOrLShItjh33v9p1Tf7aeGC-uwHb1nYZP4aW05hQppmY0");'
              ></div>
              <div class="flex h-full flex-1 flex-col items-start justify-start">
                <div class="flex w-full flex-row items-start justify-start gap-x-3">
                  <p class="text-[#111418] text-sm font-bold leading-normal tracking-[0.015em]">Liam Carter</p>
                  <p class="text-[#60758a] text-sm font-normal leading-normal">2 days ago</p>
                </div>
                <p class="text-[#111418] text-sm font-normal leading-normal">Great article! I'm excited to see how AI will shape the future.</p>
              </div>
            </div>
            <div class="flex w-full flex-row items-start justify-start gap-3 p-4 pl-[68px]">
              <div
                class="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0"
                style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBzhCISKN-tPHKAIqA3WCrfW6tPrxWldYV_N9KyPqv3Oa-Gy0hE2PqEB50TRNqEz_ruzcFfusKbLi8gTPcN6t6sQQlg28BY9KAxDf6vSRmUdFbun7iIr2lZ9NEGOOBD4W3dDESFdg91FcT5CnifWu2K8opIIzniJ-K92eTg-3E_rGsMmr8503TCAW4kODf8hOR3ACq0K-njp48m9bm1MFrdTghRNxxw6Oyp9suyMPbEeczVSUYwM9c_MK5HIJuucccjt0FQkJrz20Re");'
              ></div>
              <div class="flex h-full flex-1 flex-col items-start justify-start">
                <div class="flex w-full flex-row items-start justify-start gap-x-3">
                  <p class="text-[#111418] text-sm font-bold leading-normal tracking-[0.015em]">Chloe Turner</p>
                  <p class="text-[#60758a] text-sm font-normal leading-normal">1 day ago</p>
                </div>
                <p class="text-[#111418] text-sm font-normal leading-normal">
                  I agree, the potential of AI is immense. However, we also need to consider the ethical implications.
                </p>
              </div>
            </div>
            <div class="flex items-center px-4 py-3 gap-3 @container">
              <div
                class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0"
                style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBggKzKGEQvrw01J0jP6LsM6Yk2goIKto3qUTPIRE-vWtscfnzzmrFaCa2QmD-LrDVt96ejssJ9dgrkWrxNTWgfQuusfPkZfGs8_QCl6Dh3t1jgBZWkQBkCeiNcqDSGgbLgTv9EhCTk2pPlO_ofHkHU5CZ0yImpUFoKa8aVCuVuUrbShMYxmq1D30FpobhlkW4cXL3zAmw78FSwvgjqKDHxkd1wC5O4dUHdd0UTfPDTSr4CYdVRxeX4WFmrwx4miMbUwF9dGI3Gkkfv");'
              ></div>
              <label class="flex flex-col min-w-40 h-12 flex-1">
                <div class="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <input
                    placeholder="Add a comment..."
                    class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#f0f2f5] focus:border-none h-full placeholder:text-[#60758a] px-4 rounded-r-none border-r-0 pr-2 text-base font-normal leading-normal"
                    value=""
                  />
                  <div class="flex border-none bg-[#f0f2f5] items-center justify-center pr-4 rounded-r-lg border-l-0 !pr-2">
                    <div class="flex items-center gap-4 justify-end">
                      <div class="flex items-center gap-1"></div>
                      <button
                        class="min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#0c7ff2] text-white text-sm font-medium leading-normal hidden @[480px]:block"
                      >
                        <span class="truncate">Post</span>
                      </button>
                    </div>
                  </div>
                </div>
              </label>
            </div>
            <div class="flex justify-end overflow-hidden px-5 pb-5">
              <button
                class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 bg-[#0c7ff2] text-white text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-2 gap-4 pl-4 pr-6"
              >
                <div class="text-white" data-icon="Share" data-size="24px" data-weight="regular">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path
                      d="M229.66,109.66l-48,48a8,8,0,0,1-11.32-11.32L204.69,112H165a88,88,0,0,0-85.23,66,8,8,0,0,1-15.5-4A103.94,103.94,0,0,1,165,96h39.71L170.34,61.66a8,8,0,0,1,11.32-11.32l48,48A8,8,0,0,1,229.66,109.66ZM192,208H40V88a8,8,0,0,0-16,0V208a16,16,0,0,0,16,16H192a8,8,0,0,0,0-16Z"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
